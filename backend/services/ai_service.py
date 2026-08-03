import google.generativeai as genai
from openai import OpenAI
import httpx
import json
import logging
import time
from config.settings import Config


class AIService:
    def __init__(self):
        self._gemini_ready = False
        self._openai_ready = False
        self._openai_client = None
        self._sambanova_ready = False
        self._sambanova_client = None

        # Initialize Gemini
        try:
            if Config.GOOGLE_API_KEY:
                genai.configure(api_key=Config.GOOGLE_API_KEY)
                self._gemini_ready = True
                logging.info("Gemini configured successfully.")
            else:
                logging.error("GOOGLE_API_KEY missing.")
        except Exception as e:
            logging.error(f"Gemini init error: {e}")

        # Initialize OpenAI as fallback
        try:
            if Config.OPENAI_API_KEY:
                self._openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)
                self._openai_ready = True
                logging.info("OpenAI configured as fallback.")
            else:
                logging.error("OPENAI_API_KEY missing for fallback.")
        except Exception as e:
            logging.error(f"OpenAI init error: {e}")

        # Initialize SambaNova as third fallback
        try:
            if Config.SAMBANOVA_API_KEY:
                self._sambanova_client = httpx.Client(
                    base_url=Config.SAMBANOVA_BASE_URL,
                    headers={"Authorization": f"Bearer {Config.SAMBANOVA_API_KEY}"},
                    timeout=120.0
                )
                self._sambanova_ready = True
                logging.info("SambaNova configured as fallback.")
            else:
                logging.error("SAMBANOVA_API_KEY missing.")
        except Exception as e:
            logging.error(f"SambaNova init error: {e}")

    def _call_gemini(self, prompt, is_json=True):
        models = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-flash-latest',
            'gemini-1.5-flash',
        ]
        
        # Configure generation config with JSON mode if requested
        generation_config = {
            "temperature": 0.1,
            "top_p": 0.95,
            "max_output_tokens": 16384,
        }
        if is_json:
            generation_config["response_mime_type"] = "application/json"

        last_error = ""
        for model_name in models:
            for attempt in range(2):
                try:
                    logging.info(f"Trying Gemini model: {model_name} (attempt {attempt + 1})")
                    model = genai.GenerativeModel(model_name)
                    
                    safety_settings = [
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                    ]
                    
                    response = model.generate_content(
                        prompt, 
                        generation_config=generation_config,
                        safety_settings=safety_settings
                    )
                    
                    if response and response.text:
                        text = response.text.strip()
                        if len(text) > 5: 
                            return text
                    
                    logging.warning(f"Model {model_name} returned empty response.")
                    break 
                except Exception as e:
                    last_error = str(e)
                    if '429' in last_error:
                        logging.warning(f"{model_name} rate limited, waiting 5s...")
                        time.sleep(5)
                    elif '404' in last_error or 'not found' in last_error.lower():
                        logging.warning(f"Model {model_name} not available.")
                        break 
                    else:
                        logging.warning(f"{model_name} error: {last_error}")
                        break 
        # If Gemini fails, try OpenAI fallback
        if self._openai_ready:
            try:
                return self._call_openai(prompt, is_json)
            except Exception as openai_err:
                logging.warning(f"OpenAI failed: {openai_err}")
                # Try SambaNova if OpenAI fails
                if self._sambanova_ready:
                    return self._call_sambanova(prompt, is_json)
                raise openai_err

        raise Exception(f"AI Connection Error. Please verify your GOOGLE_API_KEY in Render settings. (Last error: {last_error})")

    def _call_openai(self, prompt, is_json=True):
        """Fallback to OpenAI when Gemini fails."""
        try:
            logging.info("Trying OpenAI GPT-4o Mini as fallback")
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=16384
            )

            if response and response.choices:
                text = response.choices[0].message.content.strip()
                if len(text) > 5:
                    logging.info("OpenAI fallback successful")
                    return text

            raise Exception("OpenAI returned empty response")
        except Exception as e:
            logging.error(f"OpenAI fallback error: {e}")
            # Try SambaNova as second fallback
            if self._sambanova_ready:
                return self._call_sambanova(prompt, is_json)
            raise Exception(f"AI services unavailable. Gemini quota exceeded and OpenAI fallback failed: {e}")

    def _call_sambanova(self, prompt, is_json=True):
        """Fallback to SambaNova when OpenAI fails."""
        try:
            logging.info("Trying SambaNova as fallback")
            response = self._sambanova_client.post(
                "/chat/completions",
                json={
                    "model": "DeepSeek-V3.1",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 16384
                }
            )
            if response.status_code == 200:
                data = response.json()
                text = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                if len(text) > 5:
                    logging.info("SambaNova fallback successful")
                    return text
            raise Exception(f"SambaNova returned status {response.status_code}")
        except Exception as e:
            logging.error(f"SambaNova fallback error: {e}")
            raise Exception(f"AI services unavailable. All providers failed: {e}")

    def analyze_resume(self, resume_text, target_role="Software Engineer"):
        if not self._gemini_ready and not self._openai_ready and not self._sambanova_ready:
            return self._fallback_analysis("AI service is not configured. Please contact the administrator.")

        start_time = time.time()
        logging.info(f"Starting analysis for role: {target_role}")
        
        # Use a focused prompt with the 12 most essential dimensions
        prompt = f"""You are an expert resume analyst and ATS specialist. Analyze this resume for a {target_role} position.

Return ONLY valid JSON with these exact keys:
overall_score (0-100), ats_score (0-100),
professional_summary (2-3 sentences), final_verdict (Strong Candidate/Good Fit/Needs Improvement/Not Ready),
skills_extraction {{technical_skills: [], soft_skills: []}},
skill_gap_analysis (array),
experience_evaluation {{career_level, years_of_experience, impact, weak_bullets: [], suggestions: []}},
projects_evaluation {{project_count, technical_depth, suggestions: []}},
education_evaluation, structure_formatting,
keyword_ats_optimization {{missing_keywords: [], suggested_keywords: []}},
strengths (array), weaknesses (array), actionable_improvements (array),
job_role_matching (array of {{role, match_percentage, reason}}),
bullet_point_rewriting (array of {{old, new}}).

RESUME:
{resume_text}
"""
        try:
            text = self._call_gemini(prompt, is_json=True)
            result = self._parse_json(text)
            logging.info(f"Analysis completed in {time.time() - start_time:.2f} seconds")
            return result
        except Exception as e:
            logging.warning(f"Full analysis failed, trying simpler prompt: {e}")
            # Retry with a much simpler prompt
            try:
                simple_prompt = f"""Analyze this resume for {target_role}. Return JSON with: overall_score, ats_score, professional_summary, final_verdict, skills_extraction (technical_skills, soft_skills), skill_gap_analysis, experience_evaluation, projects_evaluation, education_evaluation, strengths, weaknesses, actionable_improvements, keyword_ats_optimization (missing_keywords, suggested_keywords).

RESUME:
{resume_text[:4000]}
"""
                text = self._call_gemini(simple_prompt, is_json=True)
                result = self._parse_json(text)
                logging.info(f"Analysis succeeded with simpler prompt in {time.time() - start_time:.2f}s")
                return result
            except Exception as e2:
                logging.error(f"Analysis failed completely after {time.time() - start_time:.2f}s: {e2}")
                return self._fallback_analysis("AI analysis encountered an issue. Basic scores shown. Please try again.")

    def _fallback_analysis(self, warning):
        """Graceful degraded analysis returned instead of an error (prevents 422s for end users)."""
        return {
            "overall_score": 60,
            "ats_score": 55,
            "professional_summary": "Analysis temporarily unavailable. Please try again.",
            "final_verdict": "Needs Review",
            "skills_extraction": {"technical_skills": [], "soft_skills": []},
            "skill_gap_analysis": [],
            "experience_evaluation": {"career_level": "N/A", "years_of_experience": "N/A", "impact": "Unable to analyze at this time.", "weak_bullets": [], "suggestions": []},
            "projects_evaluation": {"project_count": 0, "technical_depth": "N/A", "suggestions": []},
            "education_evaluation": "Unable to analyze at this time.",
            "structure_formatting": "Unable to analyze at this time.",
            "keyword_ats_optimization": {"missing_keywords": [], "suggested_keywords": []},
            "strengths": [],
            "weaknesses": [],
            "actionable_improvements": ["Please re-submit your resume for analysis."],
            "job_role_matching": [],
            "bullet_point_rewriting": [],
            "error": None,
            "warning": warning
        }

    def generate_improved_resume(self, resume_text, analysis, target_role="Software Engineer"):
        weaknesses = analysis.get('weaknesses', [])
        missing_skills = analysis.get('skill_gap_analysis', [])
        missing_keywords = analysis.get('keyword_ats_optimization', {}).get('missing_keywords', [])
        improvements = analysis.get('actionable_improvements', [])

        prompt = f"""You are an expert resume writer. Rewrite the resume below into a professional ATS-optimized version.

TARGET ROLE: {target_role}

ORIGINAL RESUME:
{resume_text}

IMPROVEMENTS TO APPLY:
- Fix these weaknesses: {weaknesses}
- Add these missing skills where applicable: {missing_skills}
- Include these keywords naturally: {missing_keywords}
- Apply these improvements: {improvements}

Write the improved resume in this EXACT plain text format:

[CANDIDATE FULL NAME]
[email] | [phone] | [linkedin] | [github] | [city, state]

PROFESSIONAL SUMMARY
[3-4 sentences: role, years of experience, key skills, biggest achievement]

TECHNICAL SKILLS
Languages: [list from resume + relevant additions]
Frameworks: [list from resume + relevant additions]
Tools: [list from resume + relevant additions]
Databases: [list from resume]

EXPERIENCE
[Job Title] | [Company]
[City, State] | [Month Year] - [Month Year or Present]
- [Action verb + what you did + measurable result]
- [Action verb + what you did + measurable result]
- [Action verb + what you did + measurable result]

PROJECTS
[Project Name] | [Tech Stack]
[Month Year] - [Month Year]
- [What you built and its impact with metrics]
- [Key technical achievement]

EDUCATION
[Degree] in [Field]
[University] | [City] | [Year] - [Year] | GPA: [X.X]

CERTIFICATIONS
[Cert Name] | [Issuer] | [Year]

STRICT RULES:
- Use ONLY information from the original resume, enhanced with better wording
- Add realistic metrics where missing
- Use strong action verbs: Led, Built, Developed, Optimized, Architected, Delivered
- Return ONLY the resume text, no markdown, no explanation
"""
        try:
            # CRITICAL FIX: Call with is_json=False because this prompt asks for plain text, not JSON.
            # When is_json=True (default), Gemini sets response_mime_type to "application/json"
            # which causes the model to fail on non-JSON prompts.
            text = self._call_gemini(prompt, is_json=False)
            if text.startswith("```"):
                text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            return {"generated_resume": text}
        except Exception as e:
            logging.error(f"Generation failed: {e}")
            # Try a simpler prompt as last resort before giving up
            try:
                fallback_prompt = f"""Rewrite this resume for a {target_role} position. Make it professional and ATS-friendly. Return ONLY the rewritten resume, no explanations.

RESUME:
{resume_text[:3000]}"""
                text = self._call_gemini(fallback_prompt, is_json=False)
                if text and len(text) > 50:
                    return {"generated_resume": text}
            except:
                pass
            # Last resort: return a tidied version of the original so the user never hits an error
            tidied = "\n".join(line.strip() for line in resume_text.splitlines() if line.strip())
            return {
                "generated_resume": tidied,
                "warning": "AI enhancement is temporarily unavailable, so your original resume is shown. Please try again in a few minutes."
            }

    def suggest_improvement(self, section_type, current_text, target_role, resume_context=""):
        """Generate AI suggestions for a specific resume section."""
        if not self._gemini_ready and not self._openai_ready and not self._sambanova_ready:
            return {"improved_version": current_text, "suggestions": ["AI suggestions are temporarily unavailable. Please try again later."]}

        prompts = {
            "summary": f"""Improve this professional summary for a {target_role} role.
Current: "{current_text}"

Return JSON with:
- improved_version: rewritten summary (2-4 sentences)
- suggestions: array of specific tips
- keywords: array of keywords to include
""",
            "experience_bullet": f"""Rewrite this resume bullet point for a {target_role} role to be more impactful and quantified.
Current: "{current_text}"

Return JSON with:
- improved_version: rewritten bullet
- impact_score: 0-100
- why_better: brief explanation
- suggested_metrics: what metrics could be added
""",
            "skills": f"""Analyze and improve the skills section for a {target_role} role.
Current skills: "{current_text}"

Return JSON with:
- recommended_skills: array of skills to add
- skill_categories: how to organize skills
- suggestions: array of tips
""",
            "project": f"""Improve this project description for a {target_role} role.
Current: "{current_text}"

Return JSON with:
- improved_version: rewritten description
- technical_depth_score: 0-100
- suggestions: array of tips
- keywords_to_highlight: array
""",
            "experience": f"""Rewrite this experience entry for a {target_role} role to be more impactful.
Current: "{current_text}"

Return JSON with:
- improved_version: rewritten experience description
- bullet_rewrites: array of {{old, new}} for each bullet
- suggestions: array of tips
""",
            "education": f"""Improve this education entry.
Current: "{current_text}"

Return JSON with:
- improved_version: rewritten
- suggestions: array of tips
"""
        }

        prompt = prompts.get(section_type, f"""Improve this {section_type} section for a {target_role} role.
Current: "{current_text}"

Return JSON with:
- improved_version: rewritten content
- suggestions: array of tips
""")

        if resume_context:
            prompt += f"\n\nResume Context:\n{resume_context[:1000]}"

        try:
            text = self._call_gemini(prompt, is_json=True)
            result = self._parse_json(text)
            return result
        except Exception as e:
            logging.error(f"Suggestion failed: {e}")
            return {"error": str(e), "improved_version": current_text, "suggestions": []}

    def _parse_json(self, text):
        try:
            clean = text.strip()
            # Remove markdown code blocks if present
            if "```" in clean:
                if "```json" in clean:
                    clean = clean.split("```json")[1].split("```")[0].strip()
                else:
                    clean = clean.split("```")[1].split("```")[0].strip()
            
            # Find the actual JSON object start and end
            start = clean.find("{")
            end = clean.rfind("}") + 1
            if start == -1 or end == 0:
                logging.error(f"No JSON object found in text: {text[:200]}...")
                raise ValueError("No valid JSON object found in AI response.")
            
            clean = clean[start:end]
            
            # Try to fix common JSON issues before parsing
            try:
                data = json.loads(clean)
            except json.JSONDecodeError:
                # Fix trailing commas (common AI issue)
                import re
                clean = re.sub(r',\s*}', '}', clean)
                clean = re.sub(r',\s*]', ']', clean)
                # Fix single quotes instead of double quotes
                clean = re.sub(r"'([^']+)'\s*:", r'"\1":', clean)
                clean = re.sub(r":\s*'([^']+)'", r':"\1"', clean)
                try:
                    data = json.loads(clean)
                except json.JSONDecodeError as je:
                    logging.error(f"JSON Decode Error after fixes: {je}. Text: {clean[:500]}")
                    raise Exception("AI returned invalid JSON format. Please try again.")

            # Define defaults for ALL keys the frontend expects (including advanced)
            defaults = {
                "overall_score": 0,
                "ats_score": 0,
                "professional_summary": "No summary provided.",
                "final_verdict": "Needs Review",
                "skills_extraction": {"technical_skills": [], "soft_skills": []},
                "skill_gap_analysis": [],
                "experience_evaluation": {"career_level": "N/A", "years_of_experience": "N/A", "impact": "N/A", "weak_bullets": [], "suggestions": []},
                "projects_evaluation": {"project_count": 0, "technical_depth": "N/A", "suggestions": []},
                "education_evaluation": "N/A",
                "structure_formatting": "N/A",
                "keyword_ats_optimization": {"missing_keywords": [], "suggested_keywords": []},
                "strengths": [],
                "weaknesses": [],
                "actionable_improvements": [],
                "job_role_matching": [],
                "bullet_point_rewriting": [],
                # Advanced analysis defaults (for frontend backward compat)
                "recruiter_scorecard": {"overall_recommendation": "N/A", "hiring_difficulty": "N/A", "interview_recommendation": "N/A", "risk_indicators": [], "strengths_for_recruiter": [], "growth_potential": "N/A"},
                "interview_readiness": {"score": 0, "coding_challenge_likelihood": "N/A", "technical_areas_strong": [], "technical_areas_weak": [], "behavioral_questions_likely": []},
                "career_trajectory": {"trend": "N/A", "analysis": "N/A", "red_flags": [], "recommended_next_role": "N/A"},
                "competitive_analysis": {"market_position": "N/A", "unique_value_proposition": "N/A", "differentiation_opportunities": []},
                "resume_brand_assessment": {"consistent_message": False, "career_narrative": "N/A", "brand_gaps": []},
                "specificity_analysis": {"score": 0, "vague_statements": [], "specific_alternatives": []},
                "quantified_achievements": {"score": 0, "analysis": "N/A", "issues": [], "examples_of_good_quantification": []},
                "action_verbs_analysis": {"score": 0, "strong_verbs": [], "weak_verbs": [], "suggestions": []},
                "leadership_indicators": {"score": 0, "detected": [], "missing": []},
                "contact_info_check": {"complete": False, "missing": [], "issues": []},
                "resume_length_analysis": {"current_length": "N/A", "status": "N/A", "recommendations": []},
                "section_organization": {"score": 0, "issues": [], "recommended_order": []},
                "keyword_density_analysis": {"top_keywords": [], "overused_keywords": [], "missing_industry_terms": []},
                "industry_keywords": {"score": 0, "detected": [], "missing": []},
                "remote_readiness": {"score": 0, "indicators": [], "missing_remote_skills": []},
                "communication_skills": {"score": 0, "indicators": [], "weaknesses": []},
                "impact_and_results": {"score": 0, "strong_impact_statements": [], "weak_impact_statements": []},
                "ats_formatting_check": {"score": 0, "issues": [], "recommendations": []},
                "problem_solving_evidence": {"score": 0, "examples_found": [], "missing_patterns": []},
                "enhanced_projects": {"project_improvements": [], "project_suggestions": []}
            }
            
            # Fill in missing keys
            for key, val in defaults.items():
                if key not in data or data[key] is None:
                    data[key] = val
                elif isinstance(val, dict) and isinstance(data[key], dict):
                    for sub_key, sub_val in val.items():
                        if sub_key not in data[key] or data[key][sub_key] is None:
                            data[key][sub_key] = sub_val

            # Never let an AI-authored "error" field masquerade as a real failure —
            # routes treat a truthy "error" as a hard error (422), so demote it.
            if data.get("error"):
                data["warning"] = str(data.pop("error"))
                data["error"] = None

            return data
        except json.JSONDecodeError as je:
            logging.error(f"JSON Decode Error: {je}. Text: {text[:500]}")
            raise Exception("AI returned invalid JSON format. Please try again.")
        except Exception as e:
            logging.error(f"Unexpected error in _parse_json: {e}")
            raise e


# Singleton
ai_service = AIService()

import google.generativeai as genai
import json
import logging
import time
from config.settings import Config


class AIService:
    def __init__(self):
        self._gemini_ready = False
        try:
            if Config.GOOGLE_API_KEY:
                genai.configure(api_key=Config.GOOGLE_API_KEY)
                self._gemini_ready = True
                logging.info("Gemini configured successfully.")
            else:
                logging.error("GOOGLE_API_KEY missing.")
        except Exception as e:
            logging.error(f"Gemini init error: {e}")

    def _call_gemini(self, prompt, is_json=True):
        models = [
            'gemini-1.5-flash', 
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro',
            'gemini-2.0-flash-exp'
        ]
        
        # Configure generation config with JSON mode if requested
        generation_config = {
            "temperature": 0.1,
            "top_p": 0.95,
            "max_output_tokens": 4096,
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
        raise Exception(f"AI Connection Error. Please verify your GOOGLE_API_KEY in Render settings. (Last error: {last_error})")

    def analyze_resume(self, resume_text, target_role="Software Engineer"):
        if not self._gemini_ready:
            return {"error": "AI Service not initialized", "details": "The GOOGLE_API_KEY is missing or invalid in your Render environment variables."}

        start_time = time.time()
        logging.info(f"Starting analysis for role: {target_role}")
        
        prompt = f"""You are an expert resume analyst. Analyze this resume for the role: {target_role}

RESUME TEXT:
{resume_text}

Provide a detailed analysis in JSON format with these exact keys:
overall_score (0-100), ats_score (0-100), professional_summary (2-3 sentences), final_verdict, 
skills_extraction (technical_skills, soft_skills arrays), skill_gap_analysis (array), 
experience_evaluation (impact, weak_bullets, suggestions), projects_evaluation (technical_depth, suggestions), 
education_evaluation, structure_formatting, keyword_ats_optimization (missing_keywords, suggested_keywords), 
strengths (array), weaknesses (array), actionable_improvements (array), 
job_role_matching (array of {{role, match_percentage, reason}}), bullet_point_rewriting (array of {{old, new}}).
"""
        try:
            text = self._call_gemini(prompt, is_json=True)
            result = self._parse_json(text)
            logging.info(f"Analysis completed in {time.time() - start_time:.2f} seconds")
            return result
        except Exception as e:
            logging.error(f"Analysis failed after {time.time() - start_time:.2f} seconds: {e}")
            return {"error": "Analysis failed", "details": str(e)}

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
            text = self._call_gemini(prompt)
            if text.startswith("```"):
                text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            return {"generated_resume": text}
        except Exception as e:
            logging.error(f"Generation failed: {e}")
            return {"error": "Generation failed", "details": str(e)}

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
            data = json.loads(clean)

            # Define robust defaults for all required keys
            defaults = {
                "overall_score": 0,
                "ats_score": 0,
                "professional_summary": "No summary provided by AI.",
                "final_verdict": "Needs Review",
                "skills_extraction": {"technical_skills": [], "soft_skills": []},
                "skill_gap_analysis": [],
                "experience_evaluation": {
                    "career_level": "N/A",
                    "years_of_experience": "N/A",
                    "impact": "N/A",
                    "weak_bullets": [],
                    "suggestions": []
                },
                "projects_evaluation": {
                    "project_count": 0,
                    "technical_depth": "N/A",
                    "suggestions": []
                },
                "education_evaluation": "N/A",
                "structure_formatting": "N/A",
                "keyword_ats_optimization": {"missing_keywords": [], "suggested_keywords": []},
                "strengths": [],
                "weaknesses": [],
                "actionable_improvements": [],
                "job_role_matching": [],
                "bullet_point_rewriting": []
            }
            
            # Fill in missing keys recursively or at top level
            for key, val in defaults.items():
                if key not in data or data[key] is None:
                    data[key] = val
                elif isinstance(val, dict) and isinstance(data[key], dict):
                    for sub_key, sub_val in val.items():
                        if sub_key not in data[key] or data[key][sub_key] is None:
                            data[key][sub_key] = sub_val
            
            return data
        except json.JSONDecodeError as je:
            logging.error(f"JSON Decode Error: {je}. Text: {text[:500]}")
            raise Exception("AI returned invalid JSON format. Please try again.")
        except Exception as e:
            logging.error(f"Unexpected error in _parse_json: {e}")
            raise e


# Singleton
ai_service = AIService()

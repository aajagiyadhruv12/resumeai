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

        # Cap oversized inputs to prevent memory issues
        resume_text = (resume_text or "")[:20000]
        
        if len(resume_text.strip()) < 50:
            return self._fallback_analysis("Resume text too short for meaningful analysis. Please provide more content.")

        start_time = time.time()
        logging.info(f"Starting analysis for role: {target_role}")
        
        # Enhanced prompt with detailed evaluation criteria and scoring rubric
        prompt = f"""You are an expert resume analyst, ATS specialist, and hiring manager with 15+ years of experience. 
Analyze this resume THOROUGHLY for a {target_role} position. Provide specific, actionable, detailed feedback.

EVALUATION CRITERIA:
1. CONTENT QUALITY: Are achievements quantified? Are action verbs strong? Is there measurable impact?
2. ATS OPTIMIZATION: Keywords matched to {target_role}? Proper formatting? Standard section headers?
3. STRUCTURE: Logical flow? Proper section order? Consistent formatting? Clear career progression?
4. SKILLS: Technical skills relevant and current? Soft skills demonstrated? Skill gaps identified?
5. EXPERIENCE: Depth of experience? Progression shown? Impact quantified? Relevant to target role?
6. PROJECTS: Technical depth? Business impact? Technologies used? Outcomes achieved?
7. EDUCATION: Relevant to role? Certifications included? Continuous learning shown?
8. BRANDING: Consistent message? Clear value proposition? Professional tone?

SCORING RUBRIC (be strict and specific):
- overall_score: 0-100 (holistic assessment)
  * 90-100: Outstanding - ready for senior roles, exceptional content
  * 75-89: Strong - minor improvements needed, competitive candidate
  * 60-74: Good - solid foundation, several improvements needed
  * 40-59: Fair - significant improvements needed, below average
  * 0-39: Poor - major overhaul needed, not competitive
- ats_score: 0-100 (ATS parseability and keyword optimization)
  * Consider: formatting, keywords, section headers, file structure

Return ONLY valid JSON with these EXACT keys and detailed values:
{{
  "overall_score": <number 0-100>,
  "ats_score": <number 0-100>,
  "professional_summary": "<2-3 sentence specific assessment of candidate's profile>",
  "final_verdict": "<Strong Candidate/Good Fit/Needs Improvement/Not Ready - with brief reason>",
  "skills_extraction": {{
    "technical_skills": ["<specific technology/framework/tool>", ...],
    "soft_skills": ["<leadership/communication/problem-solving>", ...]
  }},
  "skill_gap_analysis": ["<specific skill missing that's critical for {target_role}>", ...],
  "experience_evaluation": {{
    "career_level": "<Entry Level/Junior/Mid-Level/Senior/Lead/Principal>",
    "years_of_experience": "<estimated years or N/A>",
    "impact": "<specific assessment of experience quality and impact>",
    "weak_bullets": ["<specific weak bullet point and why it's weak>", ...],
    "suggestions": ["<specific actionable suggestion to improve experience section>", ...]
  }},
  "projects_evaluation": {{
    "project_count": <number or 0>,
    "technical_depth": "<assessment of technical complexity shown>",
    "suggestions": ["<specific suggestion to improve project descriptions>", ...]
  }},
  "education_evaluation": "<specific assessment of education section>",
  "structure_formatting": "<specific feedback on resume structure, formatting, organization>",
  "keyword_ats_optimization": {{
    "missing_keywords": ["<specific keyword missing for {target_role}>", ...],
    "suggested_keywords": ["<specific keyword to add>", ...]
  }},
  "strengths": ["<specific strength with example from resume>", ...],
  "weaknesses": ["<specific weakness with example from resume>", ...],
  "actionable_improvements": [
    "<specific, actionable improvement #1 with details>",
    "<specific, actionable improvement #2 with details>",
    "<specific, actionable improvement #3 with details>"
  ],
  "job_role_matching": [
    {{
      "role": "<specific job title>",
      "match_percentage": <number 0-100>,
      "reason": "<specific reason for this match percentage>"
    }},
    ...
  ],
  "bullet_point_rewriting": [
    {{
      "old": "<exact weak bullet point from resume>",
      "new": "<rewritten stronger version with action verb + task + result/metrics>"
    }},
    ...
  ],
  "recruiter_scorecard": {{
    "overall_recommendation": "<Hire/No Hire/Maybe - specific reason>",
    "hiring_difficulty": "<Easy/Moderate/Hard>",
    "interview_recommendation": "<Yes/No - specific reason>",
    "risk_indicators": ["<specific risk like employment gaps, job hopping>", ...],
    "strengths_for_recruiter": ["<specific selling point>", ...],
    "growth_potential": "<assessment of growth potential>"
  }},
  "interview_readiness": {{
    "score": <number 0-100>,
    "coding_challenge_likelihood": "<High/Medium/Low>",
    "technical_areas_strong": ["<specific strong technical area>", ...],
    "technical_areas_weak": ["<specific weak technical area>", ...],
    "behavioral_questions_likely": ["<specific likely behavioral question>", ...]
  }},
  "career_trajectory": {{
    "trend": "<Positive/Stable/Negative/Unclear>",
    "analysis": "<specific analysis of career progression>",
    "red_flags": ["<specific red flag if any>", ...],
    "recommended_next_role": "<specific recommended next career move>"
  }},
  "competitive_analysis": {{
    "market_position": "<assessment of how candidate compares to market>",
    "unique_value_proposition": "<what makes this candidate unique>",
    "differentiation_opportunities": ["<specific way to stand out>", ...]
  }},
  "resume_brand_assessment": {{
    "consistent_message": <true/false>,
    "career_narrative": "<assessment of career story coherence>",
    "brand_gaps": ["<specific gap in personal brand>", ...]
  }},
  "specificity_analysis": {{
    "score": <number 0-100>,
    "vague_statements": ["<specific vague statement that needs quantification>", ...],
    "specific_alternatives": ["<specific example of how to make it concrete>", ...]
  }},
  "quantified_achievements": {{
    "score": <number 0-100>,
    "analysis": "<assessment of quantification quality>",
    "issues": ["<specific issue with metrics>", ...],
    "examples_of_good_quantification": ["<example from resume if any>", ...]
  }},
  "action_verbs_analysis": {{
    "score": <number 0-100>,
    "strong_verbs": ["<example of strong action verb used>", ...],
    "weak_verbs": ["<example of weak verb to replace>", ...],
    "suggestions": ["<specific verb suggestion>", ...]
  }},
  "leadership_indicators": {{
    "score": <number 0-100>,
    "detected": ["<specific leadership example from resume>", ...],
    "missing": ["<specific leadership aspect missing>", ...]
  }},
  "contact_info_check": {{
    "complete": <true/false>,
    "missing": ["<missing contact info like LinkedIn, portfolio, etc.>", ...],
    "issues": ["<specific contact info issue>", ...]
  }},
  "resume_length_analysis": {{
    "current_length": "<estimated pages or characters>",
    "status": "<Too Long/Too Short/Optimal>",
    "recommendations": ["<specific recommendation on length>", ...]
  }},
  "section_organization": {{
    "score": <number 0-100>,
    "issues": ["<specific organizational issue>", ...],
    "recommended_order": ["<recommended section order>", ...]
  }},
  "keyword_density_analysis": {{
    "top_keywords": ["<most frequent keyword>", ...],
    "overused_keywords": ["<keyword used too much>", ...],
    "missing_industry_terms": ["<industry term not included>", ...]
  }},
  "industry_keywords": {{
    "score": <number 0-100>,
    "detected": ["<industry keyword present>", ...],
    "missing": ["<industry keyword missing>", ...]
  }},
  "remote_readiness": {{
    "score": <number 0-100>,
    "indicators": ["<remote-work relevant skill or experience>", ...],
    "missing_remote_skills": ["<remote work skill missing>", ...]
  }},
  "communication_skills": {{
    "score": <number 0-100>,
    "indicators": ["<example of good communication>", ...],
    "weaknesses": ["<communication weakness>", ...]
  }},
  "impact_and_results": {{
    "score": <number 0-100>,
    "strong_impact_statements": ["<example of strong impact statement>", ...],
    "weak_impact_statements": ["<example needing improvement>", ...]
  }},
  "ats_formatting_check": {{
    "score": <number 0-100>,
    "issues": ["<specific ATS formatting issue>", ...],
    "recommendations": ["<specific ATS formatting fix>", ...]
  }},
  "problem_solving_evidence": {{
    "score": <number 0-100>,
    "examples_found": ["<example of problem-solving>", ...],
    "missing_patterns": ["<problem-solving pattern missing>", ...]
  }},
  "enhanced_projects": {{
    "project_improvements": [{{ "project_name": "<name>", "current_description": "<text>", "improved_description": "<better version>" }}, ...],
    "project_suggestions": [{{ "suggested_project": "<idea>", "tech_stack": "<technologies>", "impact": "<expected impact>" }}, ...]
  }}
}}

RESUME TO ANALYZE:
{resume_text}

IMPORTANT INSTRUCTIONS:
- Be SPECIFIC and ACTIONABLE in all feedback
- Reference EXACT examples from the resume
- Provide CONSTRUCTIVE criticism with solutions
- Score HONESTLY based on the rubric above
- Consider the target role: {target_role}
- Focus on what will make this candidate COMPETITIVE in today's market
- Identify both STRENGTHS and WEAKNESSES honestly
- All arrays should have SPECIFIC items, not generic advice
- If something is missing entirely, note it as a gap
- Provide VALUE-ADDED insights beyond basic checklist items
"""
        try:
            # Try with Gemini first (better for detailed analysis)
            text = self._call_gemini(prompt, is_json=True)
            result = self._parse_json(text)
            logging.info(f"Analysis completed in {time.time() - start_time:.2f} seconds")
            return result
        except Exception as e:
            logging.warning(f"Gemini analysis failed, trying OpenAI: {e}")
            # Try OpenAI as fallback (GPT-4 is excellent for resume analysis)
            try:
                if self._openai_ready:
                    text = self._call_openai(prompt, is_json=True)
                    result = self._parse_json(text)
                    logging.info(f"OpenAI analysis completed in {time.time() - start_time:.2f}s")
                    return result
            except Exception as openai_err:
                logging.warning(f"OpenAI also failed: {openai_err}")
            
            # Last attempt with simplified prompt
            logging.warning(f"Trying simplified prompt after failures")
            try:
                simple_prompt = f"""Analyze this resume for a {target_role} position. Be specific and detailed.

Return JSON with these keys: overall_score (0-100), ats_score (0-100), professional_summary, final_verdict, 
skills_extraction (technical_skills, soft_skills), skill_gap_analysis, experience_evaluation (career_level, years_of_experience, impact, weak_bullets, suggestions), 
projects_evaluation (project_count, technical_depth, suggestions), education_evaluation, structure_formatting, 
keyword_ats_optimization (missing_keywords, suggested_keywords), strengths, weaknesses, actionable_improvements, 
job_role_matching (array of {{role, match_percentage, reason}}),
bullet_point_rewriting (array of {{old, new}}).

Be specific, reference exact examples, and provide actionable feedback.

RESUME:
{resume_text[:8000]}
"""
                text = self._call_gemini(simple_prompt, is_json=True)
                result = self._parse_json(text)
                logging.info(f"Simplified analysis succeeded in {time.time() - start_time:.2f}s")
                return result
            except Exception as e2:
                logging.error(f"All analysis attempts failed after {time.time() - start_time:.2f}s: {e2}")
                return self._fallback_analysis("AI analysis encountered an issue. Basic scores shown. Please try again.")

    def _fallback_analysis(self, warning):
        """Graceful degraded analysis returned instead of an error (prevents 422s for end users).
        Provides basic template with guidance on what to look for."""
        return {
            "overall_score": 50,
            "ats_score": 50,
            "professional_summary": "AI analysis is temporarily unavailable. Please review your resume manually using these guidelines: (1) Ensure your resume has a clear professional summary (2-3 sentences). (2) Use strong action verbs: Led, Built, Developed, Created, Implemented, Optimized. (3) Quantify achievements with metrics: increased X by Y%, saved $Z, reduced time by N%. (4) Include relevant keywords for your target role throughout. (5) Structure: Contact Info, Summary, Skills, Experience, Projects, Education. (6) Use bullet points (not paragraphs) for experience and projects. (7) Keep it to 1-2 pages maximum. (8) Proofread carefully for typos and inconsistencies. (9) Add links: LinkedIn, GitHub, portfolio website if applicable. (10) Tailor your resume for each specific job application.",
            "final_verdict": "Manual Review Required",
            "skills_extraction": {"technical_skills": [], "soft_skills": []},
            "skill_gap_analysis": ["AI analysis unavailable - manually identify skills missing for your target role"],
            "experience_evaluation": {
                "career_level": "Review Required",
                "years_of_experience": "Review Required",
                "impact": "Review your experience bullets - do they show measurable impact with numbers?",
                "weak_bullets": [],
                "suggestions": [
                    "Start each bullet with a strong action verb",
                    "Include metrics: numbers, percentages, dollar amounts",
                    "Focus on results and impact, not just responsibilities",
                    "Use the formula: Action Verb + Task + Result/Metric",
                    "Remove outdated or irrelevant experience"
                ]
            },
            "projects_evaluation": {
                "project_count": 0,
                "technical_depth": "Review Required",
                "suggestions": [
                    "Include project name, tech stack, your role, and impact",
                    "Add links to GitHub or live demos if available",
                    "Describe the problem solved and business value",
                    "Highlight technical challenges and how you solved them"
                ]
            },
            "education_evaluation": "Include degree, institution, graduation year, and relevant coursework or honors",
            "structure_formatting": "Use clean, professional formatting with consistent fonts, bullet points, and white space",
            "keyword_ats_optimization": {
                "missing_keywords": ["Add keywords from the job description you're targeting"],
                "suggested_keywords": ["Research job postings for your target role to identify key skills and keywords"]
            },
            "strengths": [],
            "weaknesses": ["AI analysis unavailable"],
            "actionable_improvements": [
                "Review and rewrite your professional summary to be specific and compelling",
                "Add metrics and numbers to all experience bullets where possible",
                "Include relevant technical skills and tools for your target role",
                "Remove any irrelevant or outdated information",
                "Proofread carefully or ask someone else to review",
                "Save as PDF with a professional filename: FirstName_LastName_Resume.pdf",
                "Customize your resume for each application using keywords from the job posting"
            ],
            "job_role_matching": [],
            "bullet_point_rewriting": [],
            "error": None,
            "warning": warning,
            "recruiter_scorecard": {
                "overall_recommendation": "Manual Review Needed",
                "hiring_difficulty": "Unknown",
                "interview_recommendation": "Unknown",
                "risk_indicators": [],
                "strengths_for_recruiter": [],
                "growth_potential": "Unknown"
            },
            "interview_readiness": {
                "score": 50,
                "coding_challenge_likelihood": "Unknown",
                "technical_areas_strong": [],
                "technical_areas_weak": [],
                "behavioral_questions_likely": ["Prepare for common behavioral questions using STAR method"]
            },
            "career_trajectory": {
                "trend": "Unknown",
                "analysis": "Review your career progression - are you moving upward?",
                "red_flags": [],
                "recommended_next_role": "Based on your current experience level"
            },
            "competitive_analysis": {
                "market_position": "Unknown",
                "unique_value_proposition": "Identify what makes you unique compared to other candidates",
                "differentiation_opportunities": ["Highlight unique skills, projects, or achievements that set you apart"]
            },
            "resume_brand_assessment": {
                "consistent_message": False,
                "career_narrative": "Ensure your resume tells a coherent career story",
                "brand_gaps": ["Review for consistency in messaging across all sections"]
            },
            "specificity_analysis": {
                "score": 50,
                "vague_statements": [],
                "specific_alternatives": ["Replace vague statements with specific, quantified achievements"]
            },
            "quantified_achievements": {
                "score": 50,
                "analysis": "Add numbers, percentages, and metrics to show impact",
                "issues": ["Many bullets may lack quantification - add numbers where possible"],
                "examples_of_good_quantification": []
            },
            "action_verbs_analysis": {
                "score": 50,
                "strong_verbs": [],
                "weak_verbs": [],
                "suggestions": ["Use strong action verbs: Led, Built, Developed, Created, Implemented, Optimized, Improved, Increased, Reduced, Delivered"]
            },
            "leadership_indicators": {
                "score": 50,
                "detected": [],
                "missing": ["Highlight any leadership experience: mentoring, leading teams, initiatives launched"],
            },
            "contact_info_check": {
                "complete": False,
                "missing": ["Ensure you have: email, phone, LinkedIn URL, location (city, state)"],
                "issues": []
            },
            "resume_length_analysis": {
                "current_length": "Unknown",
                "status": "Review Required",
                "recommendations": ["Keep resume to 1 page if <10 years experience, 2 pages if more experienced"]
            },
            "section_organization": {
                "score": 50,
                "issues": [],
                "recommended_order": ["Contact Info, Professional Summary, Skills, Experience, Projects, Education, Certifications"]
            },
            "keyword_density_analysis": {
                "top_keywords": [],
                "overused_keywords": [],
                "missing_industry_terms": ["Research industry-specific terminology for your field"]
            },
            "industry_keywords": {
                "score": 50,
                "detected": [],
                "missing": ["Include industry-specific keywords and terminology"],
            },
            "remote_readiness": {
                "score": 50,
                "indicators": [],
                "missing_remote_skills": ["If applying for remote roles, highlight: self-motivation, communication tools, async collaboration"]
            },
            "communication_skills": {
                "score": 50,
                "indicators": [],
                "weaknesses": ["Ensure clear, professional communication throughout resume"]
            },
            "impact_and_results": {
                "score": 50,
                "strong_impact_statements": [],
                "weak_impact_statements": ["Focus on results and outcomes, not just responsibilities"]
            },
            "ats_formatting_check": {
                "score": 50,
                "issues": ["Avoid: tables, columns, graphics, images, headers/footers, text boxes"],
                "recommendations": ["Use simple formatting: standard fonts, bullet points, clear section headers"]
            },
            "problem_solving_evidence": {
                "score": 50,
                "examples_found": [],
                "missing_patterns": ["Include examples of problems you solved and the impact of your solutions"]
            },
            "enhanced_projects": {
                "project_improvements": [],
                "project_suggestions": []
            }
        }

    def generate_improved_resume(self, resume_text, analysis, target_role="Software Engineer"):
        # Same cap as analyze_resume — keep AI generation fast and memory-safe.
        resume_text = (resume_text or "")[:20000]
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

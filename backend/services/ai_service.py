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

    def _call_gemini(self, prompt):
        models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite']
        generation_config = {
            "temperature": 0.3,
            "top_p": 0.95,
            "max_output_tokens": 8192,
        }
        last_error = ""
        for model_name in models:
            for attempt in range(2):
                try:
                    logging.info(f"Trying {model_name} attempt {attempt + 1}")
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(prompt, generation_config=generation_config)
                    if response and response.text and len(response.text.strip()) > 50:
                        return response.text.strip()
                    break
                except Exception as e:
                    last_error = str(e)
                    if '429' in last_error:
                        if attempt == 0:
                            logging.warning(f"{model_name} rate limited, waiting 15s...")
                            time.sleep(15)
                        else:
                            break
                    else:
                        logging.warning(f"{model_name} failed: {last_error}")
                        break
        raise Exception(f"All Gemini models failed. Last error: {last_error}")

    def analyze_resume(self, resume_text, target_role="Software Engineer"):
        prompt = f"""You are an expert resume analyst and senior technical recruiter.

Analyze the resume below for the target role: {target_role}

RESUME:
{resume_text}

Return a JSON object. Base ALL values strictly on the actual resume content above. Do NOT use placeholder or example data.

{{
  "overall_score": <integer 0-100>,
  "ats_score": <integer 0-100>,
  "professional_summary": "<2-3 sentence summary of this specific candidate>",
  "final_verdict": "<Excellent | Strong Candidate | Needs Improvement | Major Revision Required>",
  "skills_extraction": {{
    "technical_skills": ["<skills actually found in resume>"],
    "soft_skills": ["<soft skills found or inferred from resume>"]
  }},
  "skill_gap_analysis": ["<skills missing for {target_role} that are not in resume>"],
  "experience_evaluation": {{
    "career_level": "<Entry-Level | Junior | Mid-Level | Senior | Lead>",
    "years_of_experience": "<e.g. 0-1 | 2-3 | 4-6 | 7+>",
    "impact": "<assessment of work impact based on resume>",
    "weak_bullets": ["<actual weak bullets from resume>"],
    "suggestions": ["<specific suggestions to improve experience section>"]
  }},
  "projects_evaluation": {{
    "project_count": <number of projects found in resume>,
    "technical_depth": "<assessment of project complexity>",
    "suggestions": ["<specific project improvement suggestions>"]
  }},
  "education_evaluation": "<assessment of education section>",
  "structure_formatting": "<assessment of resume structure>",
  "keyword_ats_optimization": {{
    "missing_keywords": ["<important keywords for {target_role} missing from resume>"],
    "suggested_keywords": ["<keywords to add to improve ATS score>"]
  }},
  "strengths": ["<actual strengths based on resume>"],
  "weaknesses": ["<actual weaknesses based on resume>"],
  "actionable_improvements": ["<specific actionable steps for this resume>"],
  "job_role_matching": [
    {{"role": "<job title>", "match_percentage": <0-100>, "reason": "<why>"}},
    {{"role": "<job title>", "match_percentage": <0-100>, "reason": "<why>"}},
    {{"role": "<job title>", "match_percentage": <0-100>, "reason": "<why>"}}
  ],
  "bullet_point_rewriting": [
    {{"old": "<actual bullet from resume>", "new": "<improved version with metrics>"}},
    {{"old": "<actual bullet from resume>", "new": "<improved version with metrics>"}}
  ]
}}

Return ONLY the JSON object. No markdown, no explanation, no code fences.
"""
        try:
            text = self._call_gemini(prompt)
            return self._parse_json(text)
        except Exception as e:
            logging.error(f"Analysis failed: {e}")
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
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            start = clean.find("{")
            end = clean.rfind("}") + 1
            if start == -1:
                raise ValueError("No JSON found in response")
            clean = clean[start:end]
            data = json.loads(clean)

            defaults = {
                "overall_score": 50,
                "ats_score": 50,
                "professional_summary": "Not available.",
                "final_verdict": "Needs Improvement",
                "skills_extraction": {"technical_skills": [], "soft_skills": []},
                "skill_gap_analysis": [],
                "experience_evaluation": {
                    "career_level": "Not specified",
                    "years_of_experience": "Not specified",
                    "impact": "Not assessed",
                    "weak_bullets": [],
                    "suggestions": []
                },
                "projects_evaluation": {
                    "project_count": 0,
                    "technical_depth": "Not assessed",
                    "suggestions": []
                },
                "education_evaluation": "Not assessed",
                "structure_formatting": "Not assessed",
                "keyword_ats_optimization": {"missing_keywords": [], "suggested_keywords": []},
                "strengths": [],
                "weaknesses": [],
                "actionable_improvements": [],
                "job_role_matching": [],
                "bullet_point_rewriting": []
            }
            for key, val in defaults.items():
                if key not in data:
                    data[key] = val
            return data
        except Exception as e:
            logging.error(f"JSON parse error: {e}")
            raise e


# Singleton
ai_service = AIService()

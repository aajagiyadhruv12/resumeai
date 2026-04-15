import google.generativeai as genai
import os
import json
import logging
from config.settings import Config
from openai import OpenAI

class AIService:
    def __init__(self):
        self._initialize()
        self.openai_client = None
        if Config.OPENAI_API_KEY:
            try:
                import httpx
                self.openai_client = OpenAI(api_key=Config.OPENAI_API_KEY, http_client=httpx.Client())
                logging.info("OpenAI Client Initialized as fallback.")
            except Exception as e:
                logging.error(f"OpenAI Init Error: {e}")

    def _initialize(self):
        try:
            api_key = Config.GOOGLE_API_KEY
            if not api_key:
                logging.error("GOOGLE_API_KEY missing. AI service disabled.")
                return
            genai.configure(api_key=api_key)
            # Use 'gemini-pro' as default for wide support
            self.model = genai.GenerativeModel('gemini-pro')
            logging.info("AI Service Initialized with gemini-pro")
        except Exception as e:
            logging.error(f"AI Service Initialization Error: {e}")

    def analyze_resume(self, resume_text, target_role="Software Engineer"):
        prompt = f"""
        You are a world-class AI Resume Analyzer, ATS optimization expert, and senior technical recruiter.
        Analyze the following resume text deeply and return a structured JSON response.

        Target Role: {target_role}
        Resume Text:
        {resume_text}

        --- ANALYSIS REQUIREMENTS ---
        Return a valid JSON object with the following structure:
        {{
            "overall_score": 0-100,
            "ats_score": 0-100,
            "skills_extraction": {{ "technical_skills": [], "soft_skills": [] }},
            "skill_gap_analysis": [],
            "experience_evaluation": {{ "impact": "description", "weak_bullets": [], "suggestions": [] }},
            "projects_evaluation": {{ "technical_depth": "description", "suggestions": [] }},
            "education_evaluation": "description",
            "structure_formatting": "description",
            "keyword_ats_optimization": {{ "missing_keywords": [], "suggested_keywords": [] }},
            "strengths": [],
            "weaknesses": [],
            "actionable_improvements": [],
            "job_role_matching": [{{ "role": "name", "match_percentage": 0 }}],
            "bullet_point_rewriting": [{{ "old": "...", "new": "..." }}],
            "professional_summary": "2-3 line summary",
            "final_verdict": "Short recommendation"
        }}

        Ensure the response is ONLY the JSON object. No markdown, no explanations.
        """

        # 1. Try Gemini Models
        models_to_try = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest']
        last_error = ""
        
        for model_name in models_to_try:
            try:
                logging.info(f"Attempting analysis with Gemini model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response and response.text:
                    return self._parse_json(response.text)
            except Exception as e:
                last_error = str(e)
                logging.warning(f"Gemini {model_name} failed: {last_error}")
                continue

        # 2. Try OpenAI Fallback (The "At Any Cost" Solution)
        if self.openai_client:
            try:
                logging.info("Gemini failed. Attempting analysis with OpenAI GPT-4o-mini...")
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a senior recruiter. Return JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                return self._parse_json(response.choices[0].message.content)
            except Exception as e:
                logging.error(f"OpenAI Fallback Failed: {e}")
                last_error = str(e)

        return {"error": "Analysis failed", "details": f"All AI models exhausted. Last error: {last_error}"}

    def generate_improved_resume(self, resume_text, analysis, target_role="Software Engineer"):
        prompt = f"""
        You are an expert resume writer. Based on the original resume and its analysis, generate a fully improved resume.

        Target Role: {target_role}
        Original Resume:
        {resume_text}

        Analysis Summary:
        - Weaknesses: {analysis.get('weaknesses', [])}
        - Skill Gaps: {analysis.get('skill_gap_analysis', [])}
        - Actionable Improvements: {analysis.get('actionable_improvements', [])}
        - Missing Keywords: {analysis.get('keyword_ats_optimization', {}).get('missing_keywords', [])}

        Generate a complete, ATS-optimized, professional resume in plain text format.
        Apply all improvements, rewrite weak bullet points, add missing keywords naturally.
        Return ONLY the resume text. No explanations, no markdown headers like ```.
        """
        models_to_try = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest']
        last_error = ""
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response and response.text:
                    return {"generated_resume": response.text.strip()}
            except Exception as e:
                last_error = str(e)
                logging.warning(f"Gemini {model_name} failed on generate: {last_error}")
                continue
        if self.openai_client:
            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert resume writer."},
                        {"role": "user", "content": prompt}
                    ]
                )
                return {"generated_resume": response.choices[0].message.content.strip()}
            except Exception as e:
                last_error = str(e)
        return {"error": "Generation failed", "details": last_error}

    def _parse_json(self, text):
        try:
            clean_text = text.strip()
            if "{" in clean_text:
                start = clean_text.find("{")
                end = clean_text.rfind("}") + 1
                clean_text = clean_text[start:end]
            
            analysis = json.loads(clean_text)
            
            # Ensure all required keys exist with default values
            defaults = {
                "overall_score": 0, "ats_score": 0,
                "skills_extraction": {"technical_skills": [], "soft_skills": []},
                "skill_gap_analysis": [],
                "experience_evaluation": {"impact": "N/A", "weak_bullets": [], "suggestions": []},
                "projects_evaluation": {"technical_depth": "N/A", "suggestions": []},
                "education_evaluation": "N/A", "structure_formatting": "N/A",
                "keyword_ats_optimization": {"missing_keywords": [], "suggested_keywords": []},
                "strengths": [], "weaknesses": [], "actionable_improvements": [],
                "job_role_matching": [], "bullet_point_rewriting": [],
                "professional_summary": "N/A", "final_verdict": "Needs Review"
            }
            for key, val in defaults.items():
                if key not in analysis:
                    analysis[key] = val
            return analysis
        except Exception as e:
            logging.error(f"JSON Parse Error: {e}")
            raise e

# Singleton instance
ai_service = AIService()

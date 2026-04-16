import google.generativeai as genai
import os
import json
import logging
import time
from config.settings import Config
from openai import OpenAI

class AIService:
    def __init__(self):
        self._initialize()
        self.openai_client = None
        self.sambanova_client = None
        
        # Initialize OpenAI Client
        if Config.OPENAI_API_KEY:
            try:
                import httpx
                self.openai_client = OpenAI(api_key=Config.OPENAI_API_KEY, http_client=httpx.Client())
                logging.info("OpenAI Client Initialized.")
            except Exception as e:
                logging.error(f"OpenAI Init Error: {e}")

        # Initialize SambaNova Client (OpenAI-compatible)
        if Config.SAMBANOVA_API_KEY:
            try:
                import httpx
                self.sambanova_client = OpenAI(
                    api_key=Config.SAMBANOVA_API_KEY,
                    base_url=Config.SAMBANOVA_BASE_URL,
                    http_client=httpx.Client()
                )
                logging.info("SambaNova Client Initialized.")
            except Exception as e:
                logging.error(f"SambaNova Init Error: {e}")

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

        # 1. Try SambaNova (User provided key, likely most reliable right now)
        if self.sambanova_client:
            try:
                logging.info("Attempting analysis with SambaNova (Llama 3.3 70B)...")
                response = self.sambanova_client.chat.completions.create(
                    model="Meta-Llama-3.3-70B-Instruct",
                    messages=[
                        {"role": "system", "content": "You are a world-class AI Resume Analyzer. Return valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    top_p=0.1
                )
                content = response.choices[0].message.content
                # Sometimes models wrap JSON in code blocks
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                
                return self._parse_json(content)
            except Exception as e:
                logging.warning(f"SambaNova Analysis Failed: {e}")
                last_error = str(e)

        # 2. Try Gemini Models with retry on rate limit
        # Optimized list: flash-lite (fastest/cheapest) -> flash -> pro
        models_to_try = [
            'gemini-1.5-flash-latest', 
            'gemini-1.5-flash', 
            'gemini-1.5-pro-latest',
            'gemini-pro'
        ]
        last_error = ""
        
        for model_name in models_to_try:
            for attempt in range(2):  # retry once after short wait
                try:
                    logging.info(f"Attempting analysis with Gemini model: {model_name} (attempt {attempt+1})")
                    model = genai.GenerativeModel(model_name)
                    
                    # Add safety settings to prevent content blocking
                    safety_settings = [
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                    ]
                    
                    response = model.generate_content(prompt, safety_settings=safety_settings)
                    
                    if response and response.text:
                        return self._parse_json(response.text)
                    
                    # If response was blocked or empty
                    if response.prompt_feedback:
                        logging.warning(f"Gemini {model_name} prompt blocked: {response.prompt_feedback}")
                    
                    break # Move to next model if this one returned empty but didn't throw
                except Exception as e:
                    last_error = str(e)
                    # Handle Rate Limit (429) specifically
                    if '429' in last_error:
                        if attempt == 0:
                            wait_time = 5 * (attempt + 1)
                            logging.warning(f"Gemini {model_name} rate limited, waiting {wait_time}s...")
                            time.sleep(wait_time)
                        else:
                            logging.warning(f"Gemini {model_name} exhausted after retries.")
                            break # Move to next model
                    elif '404' in last_error or 'not found' in last_error.lower():
                        logging.warning(f"Model {model_name} not available in this region/key.")
                        break # Move to next model
                    else:
                        logging.warning(f"Gemini {model_name} unexpected error: {last_error}")
                        break # Move to next model

        # 3. Try OpenAI Fallback (The "At Any Cost" Solution)
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

        Generate a complete, ATS-optimized, professional resume in PLAIN TEXT.
        Follow this EXACT structure:

        Line 1: Full Name only
        Line 2: email@example.com | +1-555-000-0000 | linkedin.com/in/name | github.com/name | City, State

        Then sections using ALL CAPS headers:

        PROFESSIONAL SUMMARY
        2-3 sentence impactful summary.

        TECHNICAL SKILLS
        Skill1, Skill2, Skill3, Skill4, Skill5, Skill6, Skill7, Skill8 (comma-separated on ONE line per category)

        EXPERIENCE
        Job Title at Company Name
        Company | City, State | Month Year - Month Year
        - Strong action-verb bullet with quantified result
        - Strong action-verb bullet with quantified result

        PROJECTS
        Project Name | Tech Stack
        Month Year - Month Year
        - What you built and impact

        EDUCATION
        Degree in Field
        University Name | City | Year - Year | GPA: X.X

        CERTIFICATIONS
        Certification Name | Issuer | Year

        Rules:
        - Skills MUST be comma-separated on a single line (not bullets)
        - Bullet points start with - (dash space)
        - Quantify achievements wherever possible
        - Add all missing keywords naturally
        - Return ONLY the resume text. No markdown, no ``` fences, no explanations.
        """
        # 1. Try SambaNova
        if self.sambanova_client:
            try:
                logging.info("Generating improved resume with SambaNova (Llama 3.3 70B)...")
                response = self.sambanova_client.chat.completions.create(
                    model="Meta-Llama-3.3-70B-Instruct",
                    messages=[
                        {"role": "system", "content": "You are an expert resume writer. Return only the plain text resume."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3
                )
                return {"generated_resume": response.choices[0].message.content.strip()}
            except Exception as e:
                logging.warning(f"SambaNova Resume Generation Failed: {e}")

        # 2. Fallback list for resume generation
        models_to_try = [
            'gemini-1.5-flash-latest', 
            'gemini-1.5-flash', 
            'gemini-pro'
        ]
        last_error = ""
        for model_name in models_to_try:
            for attempt in range(2):
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(prompt)
                    if response and response.text:
                        return {"generated_resume": response.text.strip()}
                    break
                except Exception as e:
                    last_error = str(e)
                    if '429' in last_error and attempt == 0:
                        time.sleep(10)
                    else:
                        logging.warning(f"Gemini {model_name} failed on generate: {last_error}")
                        break
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
            # Strip markdown code fences if present
            if clean_text.startswith("```"):
                clean_text = clean_text.split("\n", 1)[-1]
                clean_text = clean_text.rsplit("```", 1)[0].strip()
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

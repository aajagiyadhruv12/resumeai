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
        You are a Senior Technical Recruiter at FAANG company. Perform WORLD-CLASS resume analysis.

        Resume:
        {resume_text}

        Return valid JSON with EXACTLY these 16 fields. NO FIELD CAN BE EMPTY:

        1. "overall_score": 65 (realistic score)
        2. "ats_score": 60 (keyword score)
        3. "skills_extraction": {{
            "technical_skills": ["Python", "Java", "C/C++", "SQL", "Flask", "OOP", "Firebase", "Excel"],
            "soft_skills": ["Problem solving", "Analytical thinking", "Teamwork"]
        }}
        4. "skill_gap_analysis": ["JavaScript", "React", "Node.js", "AWS", "Git", "Agile"]
        5. "experience_evaluation": {{
            "impact": "Academic projects demonstrate foundational coding skills. Limited industry exposure but shows initiative.",
            "years_of_experience": "0-1",
            "career_level": "Entry-Level / Fresher",
            "weak_bullets": ["Responsible for front-end development", "Designed and developed static website"],
            "strong_bullets": ["Built Flask-based web app serving 1000+ users", "Optimized database queries reducing load time by 30%"],
            "suggestions": ["Add quantified metrics to every bullet", "Include leadership examples", "Show business impact"]
        }}
        6. "projects_evaluation": {{
            "technical_depth": "Good foundation with Flask and web technologies. Needs more complex full-stack projects.",
            "project_count": 2,
            "suggestions": ["Build full-stack project with React+Node.js", "Deploy to AWS with CI/CD pipeline", "Add GitHub portfolio"]
        }}
        7. "education_evaluation": "BCA Cyber Security student (2027 grad) - Strong technical foundation in progress"
        8. "structure_formatting": "Clean and readable but missing professional summary at top. Add clear section headers."
        9. "keyword_ats_optimization": {{
            "missing_keywords": ["JavaScript", "React", "Git", "Agile", "REST API", "AWS"],
            "suggested_keywords": ["Full Stack", "Version Control", "CI/CD", "Cloud", "Microservices"]
        }}
        10. "strengths": ["Strong programming fundamentals in Python/Java", "Good understanding of OOP concepts", "Practical Flask experience", "Cyber Security domain knowledge"]
        11. "weaknesses": ["No industry internship experience", "Missing JavaScript/React in tech stack", "Lack quantified achievements", "No visible GitHub/projects portfolio"]
        12. "actionable_improvements": [
            "Build 3 portfolio projects with live demos and GitHub links",
            "Learn React and create full-stack application",
            "Get AWS Cloud Practitioner certification",
            "Add quantified metrics to all project bullets",
            "Create professional LinkedIn profile with projects"
        ]
        13. "job_role_matching": [
            {{"role": "Junior Software Engineer", "match_percentage": 70, "reason": "Strong coding fundamentals, needs framework experience", "key_requirements_met": ["Python", "Java", "SQL"], "key_requirements_missing": ["React", "AWS"]}},
            {{"role": "Frontend Developer (Intern)", "match_percentage": 75, "reason": "Good for internship with growth potential", "key_requirements_met": ["HTML", "CSS", "Flask"], "key_requirements_missing": ["React"]}},
            {{"role": "Backend Developer (Intern)", "match_percentage": 72, "reason": "Python/Flask skills solid foundation", "key_requirements_met": ["Python", "SQL", "Flask"], "key_requirements_missing": ["Node.js"]}},
            {{"role": "Full Stack Developer", "match_percentage": 55, "reason": "Need React/Node.js for full stack", "key_requirements_met": ["Backend skills"], "key_requirements_missing": ["React", "Node.js", "Git"]}},
            {{"role": "Software Developer Trainee", "match_percentage": 78, "reason": "Excellent candidate for trainee programs", "key_requirements_met": ["Programming fundamentals"], "key_requirements_missing": []}}
        ]
        14. "bullet_point_rewriting": [
            {{"old": "Responsible for front-end development and Flask integration.", "new": "Developed responsive front-end using Flask templates, integrating REST APIs achieving 40% faster page load", "reason": "Added specific technology and performance metric"}},
            {{"old": "Designed and developed the front-end of a static website using Flask", "new": "Built static website with Flask serving 5000+ monthly visitors, improving user engagement by 25%", "reason": "Added user metrics and engagement improvement"}}
        ]
        15. "professional_summary": "Motivated BCA Cyber Security student with strong Python, Java, and C++ programming skills. Hands-on experience building web applications with Flask and database management. Passionate about secure software development and seeking entry-level opportunity to contribute to innovative tech solutions."
        16. "final_verdict": "Needs Improvement"

        STRICT RULES - FOLLOW CAREFULLY:
        - EVERY field must have REAL content - never leave empty
        - Use ONLY actual skills found in the resume
        - Bullet rewrites MUST include metrics (%, numbers, time)
        - Job roles must be actual positions with realistic match %
        - All arrays must have 2-5 items minimum
        - Return ONLY valid JSON, no markdown
        """

        # 1. Try SambaNova with much stronger system prompt
        if self.sambanova_client:
            try:
                logging.info("Attempting analysis with SambaNova (Llama 3.3 70B)...")
                response = self.sambanova_client.chat.completions.create(
                    model="Meta-Llama-3.3-70B-Instruct",
                    messages=[
                        {"role": "system", "content": "You are an ELITE resume analyst used by Fortune 500 recruiters. Your output is ALWAYS comprehensive with ALL fields filled. NEVER return empty arrays or 'N/A' values. When resume lacks info, make intelligent inferences. Return complete valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,
                    top_p=0.2
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

                    # Generate with higher token limits for detailed analysis
                    generation_config = {
                        "temperature": 0.2,
                        "top_p": 0.2,
                        "top_k": 40,
                        "max_output_tokens": 8192,
                    }

                    response = model.generate_content(prompt, safety_settings=safety_settings, generation_config=generation_config)
                    
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
                        {"role": "system", "content": "You are an elite resume analyst. Return COMPLETE JSON with ALL 40+ fields filled - every array must have items, every string must have value."},
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
        You are a TOP resume writer with 15+ years experience at Fortune 500 companies.
        Create an ADVANCED LEVEL, ATS-optimized resume that will impress recruiters and pass ATS systems.

        Target Role: {target_role}
        Current Resume:
        {resume_text}

        Key Improvements Needed:
        - Weaknesses: {analysis.get('weaknesses', [])}
        - Missing Skills: {analysis.get('skill_gap_analysis', [])}
        - Action Items: {analysis.get('actionable_improvements', [])}
        - Missing Keywords to add: {analysis.get('keyword_ats_optimization', {}).get('missing_keywords', [])}

        ADVANCED RESUME STRUCTURE (Follow exactly):

        [FULL NAME - all caps]
        [Email] | [Phone] | [LinkedIn] | [GitHub] | [Location]

        PROFESSIONAL SUMMARY
        3-4 line powerful summary with:
        - Years of experience
        - Key expertise areas
        - Notable achievements/impact
        - What you bring to the role

        TECHNICAL SKILLS (Organized by category)
        Languages: Python, Java, JavaScript, SQL
        Frameworks: React, Node.js, Flask, Django
        Tools: Git, Docker, AWS, Jenkins
        Databases: PostgreSQL, MongoDB, MySQL
        Cloud: AWS, Azure, GCP

        EXPERIENCE (Most recent first)
        [Job Title] | [Company Name]
        [Location] | [MM/YYYY - Present]
        - Led/directed/achieved [specific metric]: [result with % or $]
        - Developed/designed [specific thing] that [measurable impact]
        - Reduced/improved [process] by [X%] saving [time/money]
        - Collaborated with cross-functional teams to [result]

        PROJECTS (Show technical depth)
        [Project Name] | [Tech Stack]
        [MM/YYYY - MM/YYYY]
        - Built [specific feature] using [technologies] resulting in [metric]
        - Implemented [architecture/design] improving [performance metric]
        - [Project URL/GitHub if available]

        EDUCATION
        [Degree] in [Major]
        [University] | [Location] | [YYYY-YYYY] | GPA: [X.X/X.X]

        CERTIFICATIONS (Add relevant certs)
        [Cert Name] | [Issuer] | [Year]

        KEY RULES FOR ADVANCED RESUME:
        1. Use POWER verbs: Led, Spearheaded, Architected, Optimized, Transformed, Delivered, Exceeded
        2. Add METRICS to EVERY bullet: %, $, time saved, users impacted, efficiency gained
        3. Include ATS keywords naturally throughout
        4. Keep resume to 1-2 pages max
        5. Use clean formatting without tables or graphics
        6. Return ONLY plain text resume, no markdown
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

            # Ensure all required keys exist with default values - 16-field structure
            defaults = {
                "overall_score": 50,
                "ats_score": 50,
                "skills_extraction": {"technical_skills": ["Not specified"], "soft_skills": ["Not specified"]},
                "skill_gap_analysis": ["Pending assessment"],
                "experience_evaluation": {"impact": "Awaiting detailed resume content", "years_of_experience": "0-1", "career_level": "Entry-Level", "weak_bullets": [], "strong_bullets": [], "suggestions": []},
                "projects_evaluation": {"technical_depth": "Assessment pending - resume lacks project details", "project_count": 0, "suggestions": []},
                "enhanced_projects": {
                    "score": 40,
                    "project_improvements": [
                        {
                            "project_name": "Your Project",
                            "current_description": "weak description from resume",
                            "improved_description": "Built full-stack e-commerce platform using React and Node.js, processing 500+ daily orders with 99.9% uptime",
                            "why_better": "Added metrics, tech stack, and business impact",
                            "metrics_to_add": ["500+ orders/day", "99.9% uptime", "40% faster load time"]
                        }
                    ],
                    "project_suggestions": [
                        {
                            "suggested_project": "Full-Stack Weather App",
                            "tech_stack": "Python, Flask, React, OpenWeather API",
                            "impact": "1000+ daily active users",
                            "difficulty": "Medium"
                        },
                        {
                            "suggested_project": "Task Management API",
                            "tech_stack": "Node.js, Express, MongoDB",
                            "impact": "99.9% uptime, 50ms avg response",
                            "difficulty": "Medium"
                        }
                    ]
                },
                "education_evaluation": "Needs review",
                "structure_formatting": "Needs improvement",
                "keyword_ats_optimization": {"missing_keywords": [], "suggested_keywords": []},
                "strengths": [],
                "weaknesses": [],
                "actionable_improvements": [],
                "job_role_matching": [],
                "bullet_point_rewriting": [],
                "professional_summary": "Add professional summary",
                "final_verdict": "Needs Improvement"
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

@echo off
echo Starting AI Resume Analyzer...

start cmd /k "cd /d c:\Users\Dhruv\Desktop\AI\backend && python app.py"
timeout /t 3 /nobreak >nul
start cmd /k "cd /d c:\Users\Dhruv\Desktop\AI\frontend && npm start"

echo Both servers started!

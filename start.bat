@echo off
echo Starting AI Resume Analyzer...

start cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe app.py"
timeout /t 3 /nobreak >nul
start cmd /k "cd /d "%~dp0frontend" && npm start"

echo Both servers started!

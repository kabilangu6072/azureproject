@echo off
echo ========================================================
echo Starting Azure IoT Hub Python Flask Backend...
echo Endpoint: azure-ehub-bharathiot (Port 5000)
echo ========================================================

set PYTHON_CMD=python
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
)

%PYTHON_CMD% backend\server.py
pause

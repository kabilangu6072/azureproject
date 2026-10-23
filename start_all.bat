@echo off
echo ========================================================
echo Starting Azure IoT Hub Full Application (Backend + Frontend)
echo ========================================================

start "Azure IoT Backend" cmd /c "start_backend.bat"
timeout /t 3 /nobreak >nul
start "Azure IoT Frontend" cmd /c "start_frontend.bat"
echo Both services launched in separate windows!

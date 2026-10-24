@echo off
setlocal
echo ========================================================
echo Push Azure IoT Hub Project to Your GitHub Repository
echo ========================================================
echo.

set GIT_CMD=git
if exist "%~dp0..\mingit\cmd\git.exe" (
    set GIT_CMD="%~dp0..\mingit\cmd\git.exe"
)

echo Make sure you have created an empty repository on GitHub:
echo https://github.com/new
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/username/azure_web.git): "

if "%REPO_URL%"=="" (
    echo [ERROR] No URL entered. Aborting.
    pause
    exit /b 1
)

echo.
echo Setting remote origin to %REPO_URL%...
%GIT_CMD% remote remove origin 2>nul
%GIT_CMD% remote add origin %REPO_URL%

echo.
echo Pushing main branch to GitHub...
%GIT_CMD% push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Repository pushed successfully to GitHub!
    echo ========================================================
) else (
    echo.
    echo [NOTE] If prompted for authentication, log in using your GitHub Personal Access Token or credentials.
)

pause

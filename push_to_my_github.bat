@echo off
cd /d "%~dp0"
echo ========================================================
echo Pushing to: https://github.com/kabilangu6072/azureproject.git
echo ========================================================
echo.

"%~dp0..\mingit\cmd\git.exe" push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo [SUCCESS] Successfully pushed to https://github.com/kabilangu6072/azureproject.git
    echo ========================================================
) else (
    echo.
    echo [NOTE] If you saw an authentication error:
    echo 1. Generate a GitHub Personal Access Token at https://github.com/settings/tokens (Select 'repo' scope)
    echo 2. Use your GitHub username and the Personal Access Token as the password.
)

pause

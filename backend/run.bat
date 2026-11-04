@echo off
setlocal
cd /d "%~dp0"
echo ====================================================
echo   KeyForge API Key Management - Backend
echo ====================================================

if not exist "target\keyforge.jar" (
    echo [KeyForge] keyforge.jar not found. Building project...
    call mvnw.cmd package -DskipTests
    if errorlevel 1 (
        echo [KeyForge] Build failed. Please inspect errors above.
        pause
        exit /b 1
    )
)

echo [KeyForge] Launching server on http://localhost:8080...
java -jar target\keyforge.jar

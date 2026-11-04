Set-Location $PSScriptRoot
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  KeyForge API Key Management - Backend" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

if (-not (Test-Path "target\keyforge.jar")) {
    Write-Host "[KeyForge] Building backend artifact..." -ForegroundColor Yellow
    .\mvnw.cmd package -DskipTests
}

Write-Host "[KeyForge] Launching server on http://localhost:8080..." -ForegroundColor Green
java -jar target\keyforge.jar

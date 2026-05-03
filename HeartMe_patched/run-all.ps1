# HeartMe - subir Auth + User + Post em paralelo (Windows PowerShell)
# Rode: powershell -ExecutionPolicy Bypass -File .\run-all.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$root\auth-service\authservice`"; mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$root\user-service\userservice`"; mvn spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$root\post-service\postservice`"; mvn spring-boot:run"

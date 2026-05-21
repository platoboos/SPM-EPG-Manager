@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_dry_run.ps1"
exit /b %ERRORLEVEL%

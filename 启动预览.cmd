@echo off
cd /d "%~dp0"
node scripts\preview.cjs
if errorlevel 1 pause

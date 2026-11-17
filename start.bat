@echo off
rem Start MediaVault. The first run creates .venv and installs the app into it.
rem shortcut: dependencies are installed once; after a dependency change, delete .venv.
cd /d "%~dp0"
if not exist ".venv\.installed" (
    echo Erster Start: richte .venv ein ...
    py -3 -m venv .venv || python -m venv .venv || goto :error
    ".venv\Scripts\python.exe" -m pip install -e . || goto :error
    type nul > ".venv\.installed"
)
rem pythonw starts the app without a console window.
start "" ".venv\Scripts\pythonw.exe" -m mediavault
exit /b 0

:error
echo Einrichtung fehlgeschlagen. Ist Python 3.10 oder neuer installiert?
pause
exit /b 1

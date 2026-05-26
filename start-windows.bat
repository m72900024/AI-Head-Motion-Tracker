@echo off
REM AI Head Motion Tracker — 雙擊啟動（Windows）
cd /d "%~dp0"

set PORT=8765

echo ====================================
echo   AI 頭部動作感測器 — 本機啟動中
echo ====================================
echo.

REM 找 python
where python >nul 2>nul
if errorlevel 1 (
    where py >nul 2>nul
    if errorlevel 1 (
        echo X 找不到 Python，請先安裝 https://python.org
        pause
        exit /b 1
    )
    set PYTHON=py
) else (
    set PYTHON=python
)

set URL=http://localhost:%PORT%/
echo OK Server 啟動於 %URL%
echo OK 即將自動開瀏覽器
echo.
echo 要結束：直接關掉這個視窗 或 Ctrl-C
echo.

REM 1.5 秒後開瀏覽器
start "" /B cmd /C "timeout /t 2 >nul & start %URL%"

REM 啟 server
%PYTHON% -m http.server %PORT%

@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Node.js kontrol ediliyor...
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js yuklu degil. https://nodejs.org adresinden LTS surumu yukleyin.
  pause
  exit /b 1
)
echo Bagimliliklar yukleniyor...
call npm install
if errorlevel 1 (
  echo npm install basarisiz.
  pause
  exit /b 1
)
echo.
echo GeoJSON dosyalari olusturuluyor...
node olustur.mjs
echo.
pause

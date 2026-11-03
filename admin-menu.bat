@echo off
setlocal
cd /d "%~dp0"

:menu
cls
echo ==========================================
echo   Menu Admin Reservasi online
echo ==========================================
echo 1. Setup admin (buat admin pertama)
echo 2. Status admin
echo 3. Reset PIN admin
echo 4. Reset akun admin
echo 5. Keluar
echo.
choice /c 12345 /n /m "Pilih nomor (1-5): "
if errorlevel 5 goto end
if errorlevel 4 goto resetadmin
if errorlevel 3 goto resetpin
if errorlevel 2 goto status
if errorlevel 1 goto setup

:setup
echo.
set /p SETUP_TOKEN_INPUT=Masukkan ADMIN_SETUP_TOKEN: 
if "%SETUP_TOKEN_INPUT%"=="" (
  echo Token tidak boleh kosong.
  pause
  goto menu
)
set "ADMIN_SETUP_TOKEN=%SETUP_TOKEN_INPUT%"
set "SETUP_TOKEN=%SETUP_TOKEN_INPUT%"
echo Menjalankan setup admin...
call npm run setup
pause
goto menu

:status
echo.
echo Menjalankan status admin...
call npm run admin:status
pause
goto menu

:resetpin
echo.
echo Menjalankan reset PIN admin...
call npm run reset:pin
pause
goto menu

:resetadmin
echo.
echo Menjalankan reset akun admin...
call npm run reset:admin
pause
goto menu

:end
endlocal
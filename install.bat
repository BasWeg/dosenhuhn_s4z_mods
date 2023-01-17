cls
@echo off
set dhm=dosenhuhn_s4z_mods
 

:: check for not existing \documents directory
if not exist "%USERPROFILE%\documents" (
  echo "%USERPROFILE%\documents does not exist"
 exit
)

:: check for not existing directories and create them
if not exist "%USERPROFILE%\documents\SauceMods" (
  echo "SauceMods not in %USERPROFILE%\documents\ ... create ..."
  mkdir "%USERPROFILE%\documents\SauceMods"
)

if not exist "%USERPROFILE%\documents\SauceMods\%dhm%" (
  echo "%dhm% not in %USERPROFILE%\documents\SauceMods\ ... create dir ..."
  mkdir "%USERPROFILE%\documents\SauceMods\%dhm%" 
)
:: copy files
echo "copy mod files"
xcopy "%~dp0" "%USERPROFILE%\documents\SauceMods\%dhm%\" /s /e /f /y

:: remove install.bat
del "%USERPROFILE%\documents\SauceMods\%dhm%\install.bat"

echo "open target directory..."
timeout 5
explorer "%USERPROFILE%\documents\SauceMods\%dhm%"








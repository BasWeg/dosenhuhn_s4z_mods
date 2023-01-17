cls
@echo off
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

if not exist "%USERPROFILE%\documents\SauceMods\dosenhuhn_s4z_mods" (
  echo "dosenhuhn_s4z_mods not in %USERPROFILE%\documents\SauceMods\ ... create ..."
  mkdir "%USERPROFILE%\documents\SauceMods\dosenhuhn_s4z_mods" 
)
:: copy files
echo "copy mod files"
xcopy "%~dp0" "%USERPROFILE%\documents\SauceMods\dosenhuhn_s4z_mods\" /s /e /f /y

:: remove install.bat from target dir
del "%USERPROFILE%\documents\SauceMods\dosenhuhn_s4z_mods\install.bat"
timeout 10





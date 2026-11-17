@echo off
setlocal
cd /d "%~dp0"
set "NUTRA_REPO=caslusiqueira2-hue/Caslu"
set "NUTRA_REMOTE=https://github.com/caslusiqueira2-hue/Caslu.git"
where gh >nul 2>nul
if errorlevel 1 goto missing_gh
where git >nul 2>nul
if errorlevel 1 goto missing_git
git rev-parse --verify main >nul 2>nul
if errorlevel 1 goto missing_commit
gh auth status --hostname github.com >nul 2>nul
if not errorlevel 1 goto check_account
echo Entre na sua conta GitHub quando o aplicativo solicitar.
echo A autenticacao usa o navegador normal do computador.
gh auth login --hostname github.com --git-protocol https --web
if errorlevel 1 goto failed
:check_account
set "NUTRA_ACCOUNT="
for /f "delims=" %%A in ('gh api user --jq .login') do set "NUTRA_ACCOUNT=%%A"
if /i not "%NUTRA_ACCOUNT%"=="caslusiqueira2-hue" goto wrong_account
gh repo view "%NUTRA_REPO%" >nul 2>nul
if not errorlevel 1 goto set_remote
gh repo create "%NUTRA_REPO%" --private --description "Diario alimentar Nutra com TACO, metas e analise por foto. Pronto para Vercel."
if errorlevel 1 goto failed
:set_remote
set "NUTRA_EXISTING_REMOTE="
for /f "delims=" %%A in ('git remote get-url origin 2^>nul') do set "NUTRA_EXISTING_REMOTE=%%A"
if not defined NUTRA_EXISTING_REMOTE goto add_remote
if /i "%NUTRA_EXISTING_REMOTE%"=="%NUTRA_REMOTE%" goto push
if /i "%NUTRA_EXISTING_REMOTE%"=="git@github.com:caslusiqueira2-hue/Caslu.git" goto push
echo O remoto origin aponta para outro repositorio. Nenhum envio foi feito.
goto stop
:add_remote
git remote add origin "%NUTRA_REMOTE%"
if errorlevel 1 goto failed
:push
git -c credential.helper= -c "credential.helper=!gh auth git-credential" push --set-upstream origin main
if errorlevel 1 goto failed
echo.
echo ENVIO CONCLUIDO:
echo https://github.com/caslusiqueira2-hue/Caslu
echo.
echo O arquivo .env e o historico pessoal nao fazem parte do commit.
goto stop
:wrong_account
echo A conta conectada nao e caslusiqueira2-hue. Nenhum envio foi feito.
goto stop
:missing_gh
echo GitHub CLI nao foi encontrado neste computador.
goto stop
:missing_git
echo Git nao foi encontrado neste computador.
goto stop
:missing_commit
echo Abra este arquivo dentro da pasta original nutra-local do projeto.
goto stop
:failed
echo.
echo O envio nao foi concluido. Confira a mensagem acima.
echo Nenhum push forcado ou substituicao de historico foi realizado.
:stop
echo.
pause
endlocal

@echo off
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true && call cnpm install --production --remove-dev
@echo "call WebMiner.exe --devtools"
pause
set DEBUG=* && call WebMiner.exe --devtools

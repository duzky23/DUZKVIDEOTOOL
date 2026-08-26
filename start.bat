@echo off
title DUZKVIDEOTOOL Platform Server
cd /d D:\DUZKVIDEOTOOL\web-studio\server
set PATH=D:\node;%PATH%
start http://localhost:5000
node index.js
pause

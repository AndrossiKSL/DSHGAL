@echo off
cd /d "%~dp0"
node apps/standalone/server.mjs %*

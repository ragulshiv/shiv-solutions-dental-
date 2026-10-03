@echo off
rem Start (or rebuild after code changes) the clinic stack. Data is kept in Docker volumes.
cd /d C:\clinic\dental-erp
docker compose --env-file .env.clinic -f docker-compose.yml -f docker-compose.clinic.yml up -d --build
docker compose --env-file .env.clinic -f docker-compose.yml -f docker-compose.clinic.yml ps

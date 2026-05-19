#!/bin/bash

echo "========================================="
echo "Container starting at $(date)"
echo "========================================="

cd /home/site/wwwroot
ls -la

echo "Python version:"
python3 --version

# Ensure ChromaDB persistent directory exists under /home (writable in Azure App Service)
mkdir -p /home/chroma_data

echo "Starting application on port 8080..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8080 --log-level info
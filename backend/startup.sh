#!/bin/bash

echo "========================================="
echo "Container starting at $(date)"
echo "========================================="

cd /home/site/wwwroot
ls -la

echo "Python version:"
python3 --version

echo "Starting application..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info

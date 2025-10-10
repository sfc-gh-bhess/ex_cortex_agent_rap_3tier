#!/bin/bash

# Development startup script for Python backend

echo "🐍 Starting Python/FastAPI Backend..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Please create .env file with your Snowflake credentials"
    echo "You can copy env.example: cp env.example .env"
    exit 1
fi

# Activate virtual environment and run server
echo "✅ Virtual environment found"
echo "✅ .env file found"
echo ""
echo "🚀 Starting server on port ${BACKEND_PORT:-4000}..."
echo "📚 API docs will be available at http://localhost:${BACKEND_PORT:-4000}/docs"
echo ""

source venv/bin/activate
python server.py


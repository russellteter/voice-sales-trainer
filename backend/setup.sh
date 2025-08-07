#!/bin/bash

# Voice Sales Trainer Backend Setup Script

echo "Setting up Voice Sales Trainer Backend..."

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running the server"
fi

echo "✅ Setup complete!"
echo ""
echo "To start the development server:"
echo "1. Activate the virtual environment: source venv/bin/activate"  
echo "2. Run the server: python run.py"
echo "3. Visit http://localhost:8000/docs for API documentation"
echo ""
echo "For production deployment, see README.md"
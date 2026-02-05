#!/bin/bash

echo "🚀 Setting up Cardano Transaction Viewer..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Setup Backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Please edit backend/.env and add your Blockfrost API key!"
    echo "   Get a free API key at: https://blockfrost.io"
fi

cd ..

# Setup Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get a free Blockfrost API key from https://blockfrost.io"
echo "2. Edit backend/.env and add your API key"
echo "3. Make sure MongoDB is running (locally or use MongoDB Atlas)"
echo "4. Start the backend: cd backend && npm start"
echo "5. In a new terminal, start the frontend: cd frontend && npm start"
echo ""
echo "🌐 The app will open at http://localhost:3000"

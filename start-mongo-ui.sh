#!/bin/bash

echo "🚀 Starting MongoDB Web Interface..."
echo ""

cd backend

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Start mongo-express
npm run mongo-ui

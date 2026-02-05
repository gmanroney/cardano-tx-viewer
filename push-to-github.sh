#!/bin/bash

echo "🚀 Pushing Cardano Transaction Viewer to GitHub..."

# Add remote
git remote add origin https://github.com/gmanroney/cardano-tx-viewer.git

# Push to GitHub
git branch -M main
git push -u origin main

echo "✅ Code pushed to GitHub!"
echo "🌐 Repository URL: https://github.com/gmanroney/cardano-tx-viewer"

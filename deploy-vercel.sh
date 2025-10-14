#!/bin/bash

# Vercel deployment script
# Usage: ./deploy-vercel.sh

set -e

echo "🚀 Deploying to Vercel..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Please login:"
    vercel login
fi

# Build client if it exists
if [ -d "client" ] && [ -f "client/package.json" ]; then
    print_status "Building client application..."
    cd client
    npm install
    npm run build
    cd ..
fi

# Install server dependencies
print_status "Installing server dependencies..."
cd server
npm install --production
cd ..

# Create .env.local for Vercel
print_status "Creating Vercel environment configuration..."
cat > .env.local << EOF
NODE_ENV=production
UPLOADS_DIR=/tmp/uploads
OUTPUT_DIR=/tmp/output
TEMP_DIR=/tmp
LOGS_DIR=/tmp/logs
CORS_ORIGIN=https://your-app.vercel.app
EOF

print_warning "Please update .env.local with your actual API keys and domain!"

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls | head -n 2 | tail -n 1 | awk '{print $2}')
print_status "Deployment URL: https://$DEPLOYMENT_URL"

print_status "✅ Deployment completed!"
print_status "🌐 Your app is now live at: https://$DEPLOYMENT_URL"

print_warning "Next steps:"
echo "1. Set environment variables in Vercel dashboard:"
echo "   - OPENAI_API_KEY"
echo "   - MONDAY_API_KEY" 
echo "   - MONDAY_BOARD_ID"
echo "   - CORS_ORIGIN (your actual domain)"
echo ""
echo "2. Test your deployment:"
echo "   curl https://$DEPLOYMENT_URL/api/health"
echo ""
echo "3. Update CORS_ORIGIN in Vercel dashboard with your actual domain"

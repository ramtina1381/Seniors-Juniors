#!/bin/bash

# Vercel debugging script
# This script helps debug Vercel serverless function crashes

echo "🔧 Vercel Serverless Function Debug Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Step 1: Check if Vercel CLI is installed
print_step "1. Checking Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found. Installing..."
    npm install -g vercel
else
    print_status "Vercel CLI is installed"
fi

# Step 2: Check if logged in
print_step "2. Checking Vercel login status..."
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Please login:"
    vercel login
else
    print_status "Logged in to Vercel"
fi

# Step 3: Check package.json dependencies
print_step "3. Checking dependencies..."
if [ -f "package.json" ]; then
    print_status "Found package.json"
    
    # Check for required dependencies
    if grep -q "express" package.json; then
        print_status "✅ Express found"
    else
        print_warning "❌ Express not found in package.json"
    fi
    
    if grep -q "cors" package.json; then
        print_status "✅ CORS found"
    else
        print_warning "❌ CORS not found in package.json"
    fi
else
    print_error "No package.json found"
fi

# Step 4: Check API file
print_step "4. Checking API file..."
if [ -f "api/server.js" ]; then
    print_status "✅ api/server.js found"
else
    print_error "❌ api/server.js not found"
    print_warning "Creating minimal API file..."
    cp api/server-minimal.js api/server.js
fi

# Step 5: Check vercel.json
print_step "5. Checking vercel.json..."
if [ -f "vercel.json" ]; then
    print_status "✅ vercel.json found"
    echo "Current vercel.json:"
    cat vercel.json
else
    print_error "❌ vercel.json not found"
fi

# Step 6: Test local build
print_step "6. Testing local build..."
if [ -f "api/server.js" ]; then
    print_status "Testing API file syntax..."
    node -c api/server.js
    if [ $? -eq 0 ]; then
        print_status "✅ API file syntax is valid"
    else
        print_error "❌ API file has syntax errors"
    fi
fi

# Step 7: Check environment variables
print_step "7. Environment variables checklist..."
echo "Required environment variables:"
echo "  - NODE_ENV=production"
echo "  - UPLOADS_DIR=/tmp/uploads"
echo "  - OUTPUT_DIR=/tmp/output"
echo "  - CORS_ORIGIN=https://seniors-juniors-client-7yfg1hm21-ramtins-projects-7f18fc1c.vercel.app"
echo ""
print_warning "Make sure these are set in Vercel dashboard!"

# Step 8: Deploy and test
print_step "8. Deploying to Vercel..."
print_warning "Deploying minimal version first..."

# Use minimal version for testing
if [ -f "api/server-minimal.js" ]; then
    cp api/server-minimal.js api/server.js
    print_status "Using minimal API version for testing"
fi

# Deploy
vercel --prod

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls | head -n 2 | tail -n 1 | awk '{print $2}')
print_status "Deployment URL: https://$DEPLOYMENT_URL"

# Step 9: Test the deployment
print_step "9. Testing deployment..."
print_status "Testing health endpoint..."
curl -f "https://$DEPLOYMENT_URL/health" || print_error "Health check failed"

print_status "Testing root endpoint..."
curl -f "https://$DEPLOYMENT_URL/" || print_error "Root endpoint failed"

print_status "Testing test endpoint..."
curl -f "https://$DEPLOYMENT_URL/test" || print_error "Test endpoint failed"

echo ""
print_status "✅ Debug script completed!"
print_warning "If tests fail, check Vercel logs:"
echo "  vercel logs https://$DEPLOYMENT_URL"
echo ""
print_warning "Next steps:"
echo "1. Check Vercel dashboard for function logs"
echo "2. Verify environment variables are set"
echo "3. Test with minimal API first"
echo "4. Gradually add back your routes"

#!/bin/bash

# Deployment script for equipment processor application
# Usage: ./deploy.sh [environment]

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"
echo "📁 Script directory: $SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f "$SCRIPT_DIR/env.example" ]; then
        cp "$SCRIPT_DIR/env.example" "$SCRIPT_DIR/.env"
        print_status "Created .env file from template. Please edit it with your configuration."
    else
        print_error "env.example file not found. Cannot create .env file."
        exit 1
    fi
fi

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

print_status "Environment: $NODE_ENV"
print_status "Port: $PORT"
print_status "Uploads Directory: $UPLOADS_DIR"
print_status "Output Directory: $OUTPUT_DIR"

# Install dependencies
print_status "Installing dependencies..."
cd "$SCRIPT_DIR"

# Install root dependencies
if [ -f "package.json" ]; then
    npm install
fi

# Install server dependencies
if [ -d "server" ] && [ -f "server/package.json" ]; then
    cd server
    npm install
    cd ..
fi

# Install client dependencies
if [ -d "client" ] && [ -f "client/package.json" ]; then
    cd client
    npm install
    cd ..
fi

# Install Python dependencies
if [ -f "requirements.txt" ]; then
    print_status "Installing Python dependencies..."
    pip3 install -r requirements.txt
fi

# Create required directories
print_status "Creating required directories..."
mkdir -p "$UPLOADS_DIR"/{photos,manufacturer,jha}
mkdir -p "$OUTPUT_DIR"/jha
mkdir -p "$TEMP_DIR"
mkdir -p "$LOGS_DIR"

# Set permissions
chmod 755 "$UPLOADS_DIR" "$OUTPUT_DIR" "$TEMP_DIR" "$LOGS_DIR"

# Test configuration
print_status "Testing configuration..."
if [ -f "test-config.js" ]; then
    node test-config.js
else
    print_warning "test-config.js not found, skipping configuration test"
fi

# Build client if needed
if [ -d "client" ] && [ -f "client/package.json" ]; then
    print_status "Building client application..."
    cd client
    npm run build
    cd ..
fi

# Start the application based on environment
print_status "Starting application..."

if [ "$ENVIRONMENT" = "production" ]; then
    # Production mode - use PM2 or systemd
    if command -v pm2 &> /dev/null; then
        print_status "Starting with PM2..."
        pm2 start server/app.js --name "equipment-processor" --env production
        pm2 save
    else
        print_warning "PM2 not found. Starting with node directly..."
        NODE_ENV=production node server/app.js
    fi
else
    # Development mode
    print_status "Starting in development mode..."
    NODE_ENV=development npm run dev
fi

print_status "✅ Deployment completed successfully!"
print_status "🌐 Application should be running on port $PORT"
print_status "📖 Check DEPLOYMENT.md for additional configuration options"

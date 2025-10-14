# 🌍 Environment Configuration Guide

## ✅ Yes, you can include both production and development variables in the same `.env` file!

The application automatically chooses which variables to use based on the `NODE_ENV` environment variable.

## 🔧 How It Works

### 1. **Environment Selection**
The application looks at `NODE_ENV` to determine which variables to use:

```bash
NODE_ENV=development  # Uses DEV_* variables
NODE_ENV=staging     # Uses STAGING_* variables  
NODE_ENV=production  # Uses PROD_* variables
```

### 2. **Variable Naming Convention**
- **Development**: `DEV_PORT`, `DEV_UPLOADS_DIR`, `DEV_OPENAI_API_KEY`
- **Staging**: `STAGING_PORT`, `STAGING_UPLOADS_DIR`, `STAGING_OPENAI_API_KEY`
- **Production**: `PROD_PORT`, `PROD_UPLOADS_DIR`, `PROD_OPENAI_API_KEY`

### 3. **Fallback System**
If environment-specific variables aren't found, it falls back to generic variables:

```bash
# When NODE_ENV=development:
# 1. Tries DEV_PORT
# 2. Falls back to PORT
# 3. Uses default value if neither exists
```

## 📝 Complete .env File Example

```bash
# =============================================================================
# ENVIRONMENT SELECTION
# =============================================================================
NODE_ENV=development

# =============================================================================
# DEVELOPMENT SETTINGS
# =============================================================================
DEV_PORT=5002
DEV_CORS_ORIGIN=*
DEV_UPLOADS_DIR=uploads
DEV_OUTPUT_DIR=output
DEV_OPENAI_API_KEY=sk-dev-your-dev-key-here

# =============================================================================
# PRODUCTION SETTINGS  
# =============================================================================
PROD_PORT=5002
PROD_CORS_ORIGIN=https://yourdomain.com
PROD_UPLOADS_DIR=/var/app/uploads
PROD_OUTPUT_DIR=/var/app/output
PROD_OPENAI_API_KEY=sk-prod-your-prod-key-here

# =============================================================================
# SHARED SETTINGS (used by all environments)
# =============================================================================
MAX_FILE_SIZE=52428800
PYTHON_TIMEOUT=300000
```

## 🚀 How to Use

### **Step 1: Set Up Your .env File**
```bash
# Copy the example
cp env.example.complete .env

# Edit with your values
nano .env
```

### **Step 2: Configure for Development**
```bash
# In your .env file:
NODE_ENV=development
DEV_PORT=5002
DEV_UPLOADS_DIR=uploads
DEV_OPENAI_API_KEY=your-dev-key
```

### **Step 3: Configure for Production**
```bash
# In your .env file:
NODE_ENV=production
PROD_PORT=5002
PROD_UPLOADS_DIR=/var/app/uploads
PROD_OPENAI_API_KEY=your-prod-key
```

### **Step 4: Switch Environments**
```bash
# For development
export NODE_ENV=development
npm start

# For production
export NODE_ENV=production
npm start
```

## 🎯 Practical Examples

### **Example 1: Development Setup**
```bash
# .env file content:
NODE_ENV=development
DEV_UPLOADS_DIR=uploads
DEV_OUTPUT_DIR=output
DEV_OPENAI_API_KEY=sk-dev-123456789

# Application uses:
# - UPLOADS_DIR = "uploads"
# - OUTPUT_DIR = "output"  
# - OPENAI_API_KEY = "sk-dev-123456789"
```

### **Example 2: Production Setup**
```bash
# .env file content:
NODE_ENV=production
PROD_UPLOADS_DIR=/var/app/uploads
PROD_OUTPUT_DIR=/var/app/output
PROD_OPENAI_API_KEY=sk-prod-987654321

# Application uses:
# - UPLOADS_DIR = "/var/app/uploads"
# - OUTPUT_DIR = "/var/app/output"
# - OPENAI_API_KEY = "sk-prod-987654321"
```

### **Example 3: Mixed Configuration**
```bash
# .env file content:
NODE_ENV=development
DEV_UPLOADS_DIR=uploads
PROD_UPLOADS_DIR=/var/app/uploads
PORT=3000  # Fallback for all environments

# When NODE_ENV=development:
# - Uses DEV_UPLOADS_DIR = "uploads"
# - Ignores PROD_UPLOADS_DIR
# - PORT fallback not needed since DEV_UPLOADS_DIR exists

# When NODE_ENV=production:
# - Uses PROD_UPLOADS_DIR = "/var/app/uploads"
# - Ignores DEV_UPLOADS_DIR
# - PORT fallback not needed since PROD_UPLOADS_DIR exists
```

## 🔍 Testing Your Configuration

### **Test Environment Selection**
```bash
# Run the demo script
node demo-env-selection.js

# Test your actual configuration
node test-config.js
```

### **Verify Variables Are Loaded Correctly**
```bash
# Check which environment is active
echo $NODE_ENV

# Check if variables are loaded
node -e "console.log('UPLOADS_DIR:', process.env.UPLOADS_DIR)"
```

## 🛠️ Advanced Usage

### **Environment-Specific API Keys**
```bash
# Development (use test keys)
DEV_OPENAI_API_KEY=sk-test-123456789
DEV_MONDAY_API_KEY=test-monday-key

# Production (use real keys)
PROD_OPENAI_API_KEY=sk-prod-987654321
PROD_MONDAY_API_KEY=prod-monday-key
```

### **Different Directory Structures**
```bash
# Development (local paths)
DEV_UPLOADS_DIR=uploads
DEV_OUTPUT_DIR=output

# Production (server paths)
PROD_UPLOADS_DIR=/var/app/uploads
PROD_OUTPUT_DIR=/var/app/output

# Staging (staging paths)
STAGING_UPLOADS_DIR=/var/staging/uploads
STAGING_OUTPUT_DIR=/var/staging/output
```

### **CORS Configuration**
```bash
# Development (allow all)
DEV_CORS_ORIGIN=*

# Production (restrict to domain)
PROD_CORS_ORIGIN=https://yourdomain.com

# Staging (staging domain)
STAGING_CORS_ORIGIN=https://staging.yourdomain.com
```

## 🎉 Benefits

✅ **Single .env file** for all environments  
✅ **Automatic selection** based on NODE_ENV  
✅ **Fallback system** for missing variables  
✅ **Easy switching** between environments  
✅ **No code changes** needed to switch environments  
✅ **Secure** - production keys separate from development  

## 🚨 Important Notes

1. **Never commit real API keys** to version control
2. **Use different keys** for development and production
3. **Set NODE_ENV** before starting the application
4. **Test your configuration** with `node test-config.js`
5. **Use environment-specific directories** for production

Your application now supports **multiple environments in a single .env file** with automatic variable selection! 🎯

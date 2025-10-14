# 🔧 Vercel Serverless Function Crash Debug Guide

## ❌ **Error: "This Serverless Function has crashed"**

This error means your backend function is failing to start or execute properly. Let's debug this step by step.

## 🔍 **Step 1: Check Vercel Function Logs**

### **View Logs in Vercel Dashboard:**
1. Go to your Vercel dashboard
2. Click on your backend project
3. Go to **Functions** tab
4. Click on the failed function
5. Check the **Logs** section

### **View Logs via CLI:**
```bash
# Check function logs
vercel logs https://your-backend.vercel.app

# Check specific function
vercel logs https://your-backend.vercel.app/api/server
```

## 🐛 **Common Causes & Solutions**

### **1. Missing Dependencies**
**Error**: `Cannot find module 'express'` or similar

**Solution**: Ensure all dependencies are in `package.json`:

```bash
# In your project root
npm install express cors express-fileupload

# Or in server directory
cd server
npm install express cors express-fileupload
```

### **2. Python Dependencies Missing**
**Error**: Python script fails to run

**Solution**: Add Python dependencies to Vercel:

```bash
# Create requirements.txt in project root
pip freeze > requirements.txt

# Or manually create requirements.txt with:
pandas>=1.5.0
openpyxl>=3.0.0
Pillow>=9.0.0
openai>=1.0.0
python-dotenv>=0.19.0
requests>=2.28.0
PyPDF2>=3.0.0
pytesseract>=0.3.10
opencv-python>=4.6.0
xlwings>=0.28.0
pdf2image>=3.0.0
imagehash>=4.3.0
requests-toolbelt>=0.10.0
```

### **3. File Path Issues**
**Error**: `Cannot find module '../server/vercel-env'`

**Solution**: Check your file structure and imports.

### **4. Environment Variables Missing**
**Error**: `process.env.UPLOADS_DIR is undefined`

**Solution**: Set environment variables in Vercel dashboard.

## 🔧 **Quick Fixes**

### **Fix 1: Simplify API Handler**

Create a minimal test version of `api/server.js`:

```javascript
// api/server.js - Minimal version for testing
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Simple health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'Backend is running on Vercel',
    environment: 'production',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

module.exports = app;
```

### **Fix 2: Check Package.json**

Ensure your `package.json` has all dependencies:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "express-fileupload": "^1.5.1"
  }
}
```

### **Fix 3: Environment Variables**

Set these in Vercel dashboard → Settings → Environment Variables:

```
NODE_ENV=production
UPLOADS_DIR=/tmp/uploads
OUTPUT_DIR=/tmp/output
TEMP_DIR=/tmp
LOGS_DIR=/tmp/logs
CORS_ORIGIN=https://seniors-juniors-client-7yfg1hm21-ramtins-projects-7f18fc1c.vercel.app
```

## 🧪 **Testing Steps**

### **Step 1: Test Minimal Version**
1. Replace `api/server.js` with the minimal version above
2. Deploy: `vercel --prod`
3. Test: `curl https://your-backend.vercel.app/`

### **Step 2: Add Routes Gradually**
1. Add one route at a time
2. Test each addition
3. Check logs for errors

### **Step 3: Add Python Dependencies**
1. Add `requirements.txt` to project root
2. Redeploy
3. Test Python functionality

## 📋 **Debug Checklist**

- [ ] Check Vercel function logs
- [ ] Verify all dependencies are installed
- [ ] Check environment variables are set
- [ ] Test with minimal API handler
- [ ] Add routes gradually
- [ ] Check file paths and imports
- [ ] Verify Python dependencies

## 🚨 **Emergency Fix**

If nothing works, try this minimal `api/server.js`:

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is working' });
});

module.exports = app;
```

Deploy this first, then gradually add your functionality back.

## 📞 **Getting Help**

1. **Check Vercel logs** for specific error messages
2. **Share the error logs** for more specific help
3. **Test with minimal code** first
4. **Add complexity gradually**

Let me know what specific error you see in the Vercel logs, and I can help you fix it! 🔧

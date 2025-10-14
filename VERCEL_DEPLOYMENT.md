# 🚀 Vercel Deployment Guide

## ⚠️ Important Considerations for Vercel

Your application has some characteristics that need special handling on Vercel:

1. **File Uploads** - Vercel has temporary file storage
2. **Python Processing** - Requires Python runtime
3. **File System Operations** - Limited in serverless environment
4. **Processing Time** - Vercel has execution time limits

## 🔧 Vercel-Specific Configuration

### 1. **Environment Variables for Vercel**

Set these in your Vercel dashboard:

```bash
# Environment Selection
NODE_ENV=production

# Vercel-specific paths (using /tmp for temporary storage)
UPLOADS_DIR=/tmp/uploads
OUTPUT_DIR=/tmp/output
TEMP_DIR=/tmp
LOGS_DIR=/tmp/logs

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
MONDAY_API_KEY=your_monday_api_key_here
MONDAY_BOARD_ID=your_monday_board_id_here

# CORS (set to your Vercel domain)
CORS_ORIGIN=https://your-app.vercel.app
```

### 2. **Vercel Configuration File**

The `vercel.json` file I created handles:
- Serverless function configuration
- API routing
- Build settings
- Timeout settings (5 minutes max)

## 📋 Step-by-Step Deployment

### **Step 1: Prepare Your Application**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Build your client (if you have one)
cd client
npm run build
cd ..

# 3. Install server dependencies
cd server
npm install --production
cd ..
```

### **Step 2: Configure for Vercel**

```bash
# 1. Create .env.local for Vercel
cat > .env.local << EOF
NODE_ENV=production
UPLOADS_DIR=/tmp/uploads
OUTPUT_DIR=/tmp/output
TEMP_DIR=/tmp
LOGS_DIR=/tmp/logs
CORS_ORIGIN=https://your-app.vercel.app
OPENAI_API_KEY=your_openai_api_key_here
MONDAY_API_KEY=your_monday_api_key_here
MONDAY_BOARD_ID=your_monday_board_id_here
EOF
```

### **Step 3: Deploy to Vercel**

```bash
# 1. Login to Vercel
vercel login

# 2. Deploy your application
vercel

# 3. Set environment variables in Vercel dashboard
# Go to: https://vercel.com/dashboard -> Your Project -> Settings -> Environment Variables
```

### **Step 4: Configure Environment Variables in Vercel Dashboard**

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `UPLOADS_DIR` | `/tmp/uploads` | Production |
| `OUTPUT_DIR` | `/tmp/output` | Production |
| `TEMP_DIR` | `/tmp` | Production |
| `LOGS_DIR` | `/tmp/logs` | Production |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | Production |
| `OPENAI_API_KEY` | `your_key_here` | Production |
| `MONDAY_API_KEY` | `your_key_here` | Production |
| `MONDAY_BOARD_ID` | `your_board_id_here` | Production |

## 🐍 Python Dependencies for Vercel

### **Option 1: Use Vercel's Python Runtime**

Create a `requirements.txt` in your project root:

```txt
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

### **Option 2: Use External Python Service**

For better performance, consider using an external Python service:

```javascript
// Instead of calling Python directly, call an external service
const response = await fetch('https://your-python-service.herokuapp.com/process', {
  method: 'POST',
  body: formData
});
```

## ⚠️ Vercel Limitations & Solutions

### **Limitation 1: File Storage**
- **Problem**: Files are temporary in `/tmp`
- **Solution**: Use external storage (AWS S3, Google Cloud Storage)

### **Limitation 2: Processing Time**
- **Problem**: 5-minute execution limit
- **Solution**: Use background jobs or external services

### **Limitation 3: Python Dependencies**
- **Problem**: Complex Python packages may not work
- **Solution**: Use external Python service or simplify dependencies

## 🔄 Alternative Architecture for Vercel

### **Recommended Approach:**

1. **Frontend**: Deploy React app to Vercel
2. **Backend**: Use Vercel for API routes (file uploads)
3. **Processing**: Use external Python service (Heroku, Railway, etc.)
4. **Storage**: Use cloud storage (AWS S3, etc.)

### **Example Architecture:**

```
User Upload → Vercel API → Cloud Storage → External Python Service → Results
```

## 🚀 Quick Deploy Commands

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# 3. Set environment variables
vercel env add NODE_ENV production
vercel env add UPLOADS_DIR /tmp/uploads
vercel env add OPENAI_API_KEY your_key_here

# 4. Redeploy with new environment variables
vercel --prod
```

## 🧪 Testing Your Vercel Deployment

### **Test API Endpoints:**

```bash
# Test health check
curl https://your-app.vercel.app/api/

# Test file upload
curl -X POST https://your-app.vercel.app/api/upload/photos/123 \
  -F "photos=@test-image.jpg"
```

### **Check Logs:**

```bash
# View Vercel function logs
vercel logs https://your-app.vercel.app
```

## 🎯 Best Practices for Vercel

1. **Use `/tmp` for temporary files**
2. **Set appropriate timeouts**
3. **Use external storage for persistence**
4. **Consider background processing**
5. **Optimize Python dependencies**
6. **Use Vercel's edge functions for simple operations**

## 🔧 Troubleshooting

### **Common Issues:**

1. **"Function timeout"**
   - Reduce processing time
   - Use external services for heavy processing

2. **"File not found"**
   - Check `/tmp` directory usage
   - Use cloud storage for persistence

3. **"Python dependencies missing"**
   - Simplify Python requirements
   - Use external Python service

4. **"CORS errors"**
   - Set correct `CORS_ORIGIN` in environment variables
   - Update frontend to use Vercel domain

## 📊 Monitoring

- **Vercel Dashboard**: Monitor function executions
- **Logs**: Check function logs for errors
- **Analytics**: Use Vercel Analytics for performance

Your application can be deployed to Vercel, but consider the limitations and use the recommended architecture for the best experience! 🎉

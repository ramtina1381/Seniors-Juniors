# 🎯 Vercel Environment Variables - Visual Guide

## 📍 **Where to Add Environment Variables**

### **Step 1: Vercel Dashboard Navigation**
```
vercel.com/dashboard
    ↓
Click your project
    ↓
Settings tab
    ↓
Environment Variables (left sidebar)
    ↓
Add New button
```

### **Step 2: Add Each Variable**

For each variable, click **"Add New"** and fill in:

```
┌─────────────────────────────────────┐
│ Add Environment Variable            │
├─────────────────────────────────────┤
│ Name: NODE_ENV                      │
│ Value: production                   │
│ Environment: Production            │
│ [Add] [Cancel]                     │
└─────────────────────────────────────┘
```

## 📋 **Complete Variable List**

Add these **one by one** in Vercel dashboard:

### **1. Basic Configuration**
```
Name: NODE_ENV
Value: production
Environment: Production
```

```
Name: UPLOADS_DIR
Value: /tmp/uploads
Environment: Production
```

```
Name: OUTPUT_DIR
Value: /tmp/output
Environment: Production
```

```
Name: TEMP_DIR
Value: /tmp
Environment: Production
```

```
Name: LOGS_DIR
Value: /tmp/logs
Environment: Production
```

### **2. CORS Configuration**
```
Name: CORS_ORIGIN
Value: https://your-actual-domain.vercel.app
Environment: Production
```
*Replace with your actual Vercel domain*

### **3. API Keys**
```
Name: OPENAI_API_KEY
Value: sk-your-actual-openai-key-here
Environment: Production
```

```
Name: MONDAY_API_KEY
Value: your-actual-monday-key-here
Environment: Production
```

```
Name: MONDAY_BOARD_ID
Value: your-actual-board-id-here
Environment: Production
```

## 🔄 **Deployment Process**

### **1. First Deployment (to get domain)**
```bash
vercel
# Note the URL: https://my-app-abc123.vercel.app
```

### **2. Add Environment Variables**
- Go to Vercel dashboard
- Add all variables above
- Use your actual domain for `CORS_ORIGIN`

### **3. Redeploy with Variables**
```bash
vercel --prod
```

## ✅ **Verification Steps**

### **Test Environment Variables**
```bash
curl https://your-domain.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "production",
  "uploadsDir": "/tmp/uploads",
  "outputDir": "/tmp/output"
}
```

### **Check Vercel Logs**
```bash
vercel logs https://your-domain.vercel.app
```

## 🎯 **Key Points**

1. **Add variables in Vercel dashboard** (not local .env file)
2. **Use your actual Vercel domain** for CORS_ORIGIN
3. **Redeploy after adding variables**
4. **All variables go to Production environment**
5. **Use real API keys** (not placeholders)

## 🚨 **Common Issues**

### **Issue: Variables not working**
- **Solution**: Redeploy after adding variables
- **Command**: `vercel --prod`

### **Issue: CORS errors**
- **Solution**: Set CORS_ORIGIN to your actual Vercel domain
- **Check**: Vercel dashboard → Settings → Environment Variables

### **Issue: File uploads not working**
- **Solution**: Ensure UPLOADS_DIR is set to `/tmp/uploads`
- **Check**: Variables are added to Production environment

Your environment variables are now configured on the server side (Vercel)! 🎉

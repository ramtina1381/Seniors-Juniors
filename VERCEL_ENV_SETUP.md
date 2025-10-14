# 🔧 Vercel Environment Variables Setup

## ✅ Yes, environment variables are added on the server side (Vercel dashboard)

You need to add these environment variables in your **Vercel project settings**, not in your local `.env` file.

## 📍 Where to Add Environment Variables

### **Step 1: Go to Vercel Dashboard**
1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** tab
4. Click **Environment Variables** in the left sidebar

### **Step 2: Add Each Variable**

Click **Add New** for each environment variable:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `UPLOADS_DIR` | `/tmp/uploads` | Production |
| `OUTPUT_DIR` | `/tmp/output` | Production |
| `TEMP_DIR` | `/tmp` | Production |
| `LOGS_DIR` | `/tmp/logs` | Production |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | Production |
| `OPENAI_API_KEY` | `your_actual_openai_key_here` | Production |
| `MONDAY_API_KEY` | `your_actual_monday_key_here` | Production |
| `MONDAY_BOARD_ID` | `your_actual_board_id_here` | Production |

## 🎯 **Important Notes**

### **1. Use Your Actual Vercel Domain**
- Replace `https://your-app.vercel.app` with your actual Vercel domain
- You'll get this after your first deployment

### **2. Use Real API Keys**
- Replace placeholder values with your actual API keys
- These are the same keys you use locally

### **3. All Variables Go to Production**
- Since Vercel runs in production mode
- No need to set development/staging versions

## 🚀 **Step-by-Step Process**

### **Before Deployment:**
```bash
# 1. Deploy first to get your domain
vercel

# 2. Note your deployment URL (e.g., https://my-app-abc123.vercel.app)
```

### **After Deployment:**
1. **Go to Vercel Dashboard**
2. **Select your project**
3. **Settings → Environment Variables**
4. **Add each variable** (see table above)
5. **Redeploy** to apply changes:
   ```bash
   vercel --prod
   ```

## 🔍 **How to Verify Environment Variables**

### **Test Your Deployment:**
```bash
# Check if environment variables are loaded
curl https://your-app.vercel.app/api/health

# Should return something like:
# {
#   "status": "healthy",
#   "environment": "production",
#   "uploadsDir": "/tmp/uploads",
#   "outputDir": "/tmp/output"
# }
```

### **Check Vercel Function Logs:**
```bash
# View logs to see if variables are loaded
vercel logs https://your-app.vercel.app
```

## ⚠️ **Common Mistakes**

### **❌ Don't Do This:**
- Add variables to local `.env` file (won't work on Vercel)
- Use local file paths (like `./uploads`)
- Forget to redeploy after adding variables

### **✅ Do This:**
- Add variables in Vercel dashboard
- Use Vercel paths (`/tmp/uploads`)
- Redeploy after adding variables

## 🎯 **Quick Checklist**

- [ ] Deploy to Vercel first
- [ ] Get your Vercel domain
- [ ] Go to Vercel dashboard → Settings → Environment Variables
- [ ] Add all required variables
- [ ] Set `CORS_ORIGIN` to your actual Vercel domain
- [ ] Redeploy with `vercel --prod`
- [ ] Test with `curl https://your-domain.vercel.app/api/health`

## 🔄 **After Adding Variables**

```bash
# Redeploy to apply environment variables
vercel --prod

# Test your deployment
curl https://your-app.vercel.app/api/health
```

Your environment variables are now available to your serverless functions on Vercel! 🎉

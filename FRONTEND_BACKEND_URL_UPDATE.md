# 🔗 Frontend-Backend URL Configuration

## ✅ **What I've Updated**

I've updated all your client-side code to use dynamic API URLs instead of hardcoded `localhost:5002` URLs.

### **Files Updated:**
- ✅ `client/src/config/api.js` - New API configuration system
- ✅ `client/src/pages/Decoms.js` - Updated API calls
- ✅ `client/src/pages/JHA.js` - Updated API calls  
- ✅ `client/src/pages/Credit.js` - Updated API calls
- ✅ `client/src/components/FileUpload.js` - Updated upload URLs
- ✅ `client/src/components/JHAFileUpload.js` - Updated upload URLs

## 🔧 **What You Need to Do**

### **Step 1: Update Backend URL in API Config**

Edit `client/src/config/api.js` and replace the placeholder URL:

```javascript
// Change this line:
baseURL: 'https://seniors-juniors-server.vercel.app/', // Replace with your actual backend URL

// To your actual backend URL:
baseURL: 'https://seniors-juniors-server.vercel.app/',
```

### **Step 2: Deploy Your Backend to Vercel**

You need to deploy your backend separately to get its URL:

```bash
# Deploy backend to Vercel
vercel

# Note the backend URL (e.g., https://your-backend-abc123.vercel.app)
```

### **Step 3: Update API Configuration**

Once you have your backend URL, update `client/src/config/api.js`:

```javascript
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:5002',
    apiPrefix: '/api'
  },
  
  production: {
    baseURL: 'https://seniors-juniors-server.vercel.app/', // ← Update this
    apiPrefix: '/api'
  }
};
```

### **Step 4: Set CORS Origin in Backend**

In your Vercel backend environment variables, set:

```
CORS_ORIGIN=https://seniors-juniors-client-7yfg1hm21-ramtins-projects-7f18fc1c.vercel.app
```

## 🎯 **How It Works Now**

### **Automatic Environment Detection:**
- **Development**: Uses `http://localhost:5002` when running locally
- **Production**: Uses your Vercel backend URL when deployed

### **API URL Examples:**
```javascript
// Development (localhost)
buildApiUrl('/process') → 'http://localhost:5002/api/process'

// Production (Vercel)
buildApiUrl('/process') → 'https://seniors-juniors-server.vercel.app//api/process'
```

## 📋 **Complete Setup Checklist**

### **Backend Setup:**
- [ ] Deploy backend to Vercel
- [ ] Get backend URL
- [ ] Set environment variables in Vercel dashboard
- [ ] Set `CORS_ORIGIN` to your frontend URL

### **Frontend Setup:**
- [ ] Update `client/src/config/api.js` with backend URL
- [ ] Rebuild and redeploy frontend
- [ ] Test API connections

## 🧪 **Testing Your Setup**

### **Test Backend Health:**
```bash
curl https://seniors-juniors-server.vercel.app//api/health
```

### **Test Frontend-Backend Connection:**
1. Open your frontend: `https://seniors-juniors-client-7yfg1hm21-ramtins-projects-7f18fc1c.vercel.app`
2. Try uploading files
3. Check browser console for any CORS errors

## 🔄 **Deployment Commands**

### **Backend Deployment:**
```bash
# Deploy backend
vercel

# Set environment variables in Vercel dashboard
# CORS_ORIGIN=https://seniors-juniors-client-7yfg1hm21-ramtins-projects-7f18fc1c.vercel.app
```

### **Frontend Deployment:**
```bash
# Update API config with backend URL
# Rebuild and redeploy
cd client
npm run build
vercel --prod
```

## ✅ **Benefits of This Setup**

- ✅ **Automatic environment detection**
- ✅ **No hardcoded URLs**
- ✅ **Works in both development and production**
- ✅ **Easy to maintain and update**
- ✅ **CORS properly configured**

Your frontend will now automatically connect to the correct backend URL based on the environment! 🎉

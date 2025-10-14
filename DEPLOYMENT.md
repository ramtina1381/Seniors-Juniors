# Deployment Guide

This guide explains how to deploy your application to different environments with dynamic file path configuration.

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and configure it for your deployment:

```bash
cp env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your deployment settings:

#### Development (Local)
```env
NODE_ENV=development
PORT=5002
CORS_ORIGIN=*
UPLOADS_DIR=uploads
OUTPUT_DIR=output
TEMP_DIR=temp
LOGS_DIR=logs
```

#### Production
```env
NODE_ENV=production
PORT=5002
CORS_ORIGIN=https://yourdomain.com
UPLOADS_DIR=/var/app/uploads
OUTPUT_DIR=/var/app/output
TEMP_DIR=/tmp
LOGS_DIR=/var/log/your-app
```

## 📁 Directory Structure

The application now uses dynamic paths that can be configured via environment variables:

```
your-deployment/
├── app/                    # Your application code
├── uploads/               # Upload directory (configurable)
│   ├── photos/
│   ├── manufacturer/
│   └── jha/
├── output/                # Output directory (configurable)
│   └── jha/
├── temp/                  # Temporary files (configurable)
└── logs/                  # Log files (configurable)
```

## 🔧 Deployment Options

### Option 1: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install Python and dependencies
RUN apk add --no-cache python3 py3-pip
RUN pip3 install pandas openpyxl pillow openai python-dotenv requests PyPDF2 pytesseract opencv-python xlwings pdf2image

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p uploads output temp logs

# Set environment variables
ENV NODE_ENV=production
ENV UPLOADS_DIR=/app/uploads
ENV OUTPUT_DIR=/app/output
ENV TEMP_DIR=/app/temp
ENV LOGS_DIR=/app/logs

EXPOSE 5002

CMD ["npm", "start"]
```

### Option 2: Cloud Deployment (AWS, GCP, Azure)

#### Environment Variables for Cloud:
```env
NODE_ENV=production
PORT=5002
CORS_ORIGIN=https://yourdomain.com
UPLOADS_DIR=/tmp/uploads
OUTPUT_DIR=/tmp/output
TEMP_DIR=/tmp
LOGS_DIR=/tmp/logs
```

#### For Persistent Storage:
```env
UPLOADS_DIR=/var/storage/uploads
OUTPUT_DIR=/var/storage/output
TEMP_DIR=/tmp
LOGS_DIR=/var/log/your-app
```

### Option 3: VPS/Server Deployment

1. **Create deployment directories:**
```bash
sudo mkdir -p /var/app/uploads
sudo mkdir -p /var/app/output
sudo mkdir -p /var/app/logs
sudo chown -R $USER:$USER /var/app
```

2. **Set environment variables:**
```env
NODE_ENV=production
UPLOADS_DIR=/var/app/uploads
OUTPUT_DIR=/var/app/output
TEMP_DIR=/tmp
LOGS_DIR=/var/app/logs
```

## 🔐 Security Considerations

### Production Security Checklist:

1. **CORS Configuration:**
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **File Upload Limits:**
   - Configured via environment (default: 50MB)
   - Validate file types server-side

3. **API Keys:**
   - Store in environment variables
   - Never commit to version control

4. **Directory Permissions:**
   ```bash
   chmod 755 /var/app/uploads
   chmod 755 /var/app/output
   ```

## 📊 Monitoring & Logging

### Log Files:
- `logs/server_errors.log` - Server errors
- `logs/equipment_processor.log` - Python processing logs

### Health Check:
```bash
curl http://localhost:5002/
# Should return: {"status":"Backend is running"}
```

## 🐛 Troubleshooting

### Common Issues:

1. **Permission Denied:**
   ```bash
   sudo chown -R $USER:$USER /var/app
   chmod 755 /var/app/uploads
   ```

2. **Python Dependencies:**
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Port Already in Use:**
   ```bash
   lsof -ti:5002 | xargs kill -9
   ```

4. **Directory Not Found:**
   - Check environment variables
   - Ensure directories exist
   - Verify path permissions

### Debug Mode:
```env
NODE_ENV=development
```

This enables detailed logging and relaxed CORS.

## 🔄 Migration from Hardcoded Paths

If you're migrating from the old hardcoded system:

1. **Backup your data:**
   ```bash
   cp -r uploads/ backup/uploads/
   cp -r output/ backup/output/
   ```

2. **Update environment variables:**
   - Set `UPLOADS_DIR` to your current uploads location
   - Set `OUTPUT_DIR` to your current output location

3. **Test the new configuration:**
   ```bash
   npm start
   # Check logs for path configuration
   ```

## 📝 Environment Variables Reference

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | `development` | `production` |
| `PORT` | Server port | `5002` | `8080` |
| `CORS_ORIGIN` | Allowed origins | `*` | `https://app.com` |
| `UPLOADS_DIR` | Upload directory | `uploads` | `/var/app/uploads` |
| `OUTPUT_DIR` | Output directory | `output` | `/var/app/output` |
| `TEMP_DIR` | Temporary directory | `temp` | `/tmp` |
| `LOGS_DIR` | Log directory | `logs` | `/var/log/app` |

## 🚀 Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Set secure directory paths
- [ ] Install all Python dependencies
- [ ] Configure API keys in environment
- [ ] Set up proper file permissions
- [ ] Configure logging directory
- [ ] Test file upload/processing
- [ ] Set up monitoring
- [ ] Configure backup strategy

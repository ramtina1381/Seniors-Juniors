# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Install system dependencies for Python and image processing
RUN apk add --no-cache \
    python3 \
    py3-pip \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    poppler-utils \
    libjpeg-turbo-dev \
    zlib-dev \
    libpng-dev \
    gcc \
    musl-dev

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install Node.js dependencies
RUN npm install
RUN cd server && npm install

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create required directories with proper permissions
RUN mkdir -p uploads output temp logs && \
    chmod 755 uploads output temp logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5002

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5002
ENV UPLOADS_DIR=/app/uploads
ENV OUTPUT_DIR=/app/output
ENV TEMP_DIR=/app/temp
ENV LOGS_DIR=/app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5002/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]

FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Set npm timeout and memory limits
ENV NPM_CONFIG_TIMEOUT=300000
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files
COPY package*.json ./

# Install dependencies with timeout and retry
RUN npm ci --timeout=300000 --maxsockets=1 || npm ci --timeout=300000

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check with longer timeout for initial start
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:3000 || exit 1

# Start the development server
CMD ["npm", "start"] 
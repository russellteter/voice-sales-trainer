# Frontend Dockerfile for Next.js application
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies based on the package manager available
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Run the application in development mode
CMD ["npm", "run", "dev"]
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for potential build steps)
RUN npm ci

# Copy source code
COPY . .

# Production stage
FROM node:20-alpine AS production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Europe/Berlin

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

# Create data directory
RUN mkdir -p /app/src/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/status || exit 1

# Start application
CMD ["node", "src/server.js"]

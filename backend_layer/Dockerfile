# ============================================
# MULTI-STAGE DOCKERFILE FOR NESTJS BACKEND
# ============================================

# Stage 1: Build Stage
# Purpose: Install all dependencies & build the TypeScript code
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build tools (needed for some npm packages like bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files first (for better Docker caching)
COPY package.json ./
COPY package-lock.json* ./

# Install ALL dependencies including devDependencies (required for build)
# Explicitly set NODE_ENV=development to ensure devDependencies are installed
RUN NODE_ENV=development npm install

# Copy all source code
COPY . .

# Build the TypeScript code to JavaScript
# Run build and verify output
RUN echo "Building NestJS application..." && \
  NODE_ENV=development npm run build && \
  echo "Build complete. Checking dist folder:" && \
  ls -la ./dist/src/ && \
  test -f ./dist/src/main.js && echo "✅ dist/src/main.js exists" || (echo "❌ dist/src/main.js NOT found" && exit 1)

# ============================================

# Stage 2: Production Stage
# Purpose: Create a minimal image with only production files
FROM node:20-alpine AS production

# Install wget for healthcheck and build tools for native modules
RUN apk add --no-cache wget python3 make g++

# ============================================
# Security: Create non-root user
# ============================================
RUN addgroup -g 1001 -S appgroup && \
  adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G appgroup appuser

# Set working directory
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install ONLY production dependencies (smaller image)
RUN npm install --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Verify dist was copied correctly
RUN ls -la ./dist/src/ && test -f ./dist/src/main.js

# Create logs directory and set ownership
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the port (configurable via PORT env var, default 3000)
ARG PORT=3000
EXPOSE ${PORT}

# Health check (uses PORT env var at runtime, defaults to 3000)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the application - note: main.js is in dist/src/ folder
CMD ["node", "dist/src/main.js"]

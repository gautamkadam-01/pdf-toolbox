FROM node:22-bookworm-slim

# Install system dependencies required for PDF processing
RUN apt-get update && apt-get install -y \
    libreoffice \
    chromium \
    ghostscript \
    fonts-liberation \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend package files first
COPY package.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy backend source
COPY src ./src

# Create temporary directories
RUN mkdir -p temp/uploads temp/outputs

# Production environment
ENV NODE_ENV=production
ENV PORT=5000
ENV OFFICE_CONVERTER_PATH=libreoffice
ENV BROWSER_EXECUTABLE_PATH=chromium
ENV GHOSTSCRIPT_PATH=gs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]

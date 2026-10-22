
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
    libreoffice \
    chromium \
    ghostscript \
    fonts-liberation \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN mkdir -p temp/uploads temp/outputs

ENV NODE_ENV=production
ENV PORT=5000
ENV OFFICE_CONVERTER_PATH=libreoffice
ENV BROWSER_EXECUTABLE_PATH=chromium
ENV GHOSTSCRIPT_PATH=gs

EXPOSE 5000

CMD ["npm", "start"]

# Docker futuro: whatsapp-web.js necesita dependencias de Chromium y persistencia
# para la sesion. Para uso local inicial, preferir `npm run dev`.
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV WHATSAPP_HEADLESS=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["npm", "start"]

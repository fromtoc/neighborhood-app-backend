FROM node:20-slim

# Puppeteer 需要的 Chromium 依賴
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto-cjk \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY index.js .

EXPOSE 5501
CMD ["node", "index.js"]

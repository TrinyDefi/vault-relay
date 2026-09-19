FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY worker.mjs ./
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=192
CMD ["node", "worker.mjs"]

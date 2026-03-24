FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci

# Build client and server
COPY client/ client/
COPY server/ server/
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/
RUN cd server && npm ci --omit=dev

COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/client/dist client/dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/dist/index.js"]

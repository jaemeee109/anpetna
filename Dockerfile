# 1) deps
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# 2) build
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY .env.production .env.production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOST=0.0.0.0

# 보안: non-root
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone 산출물만 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p /app/.next/cache && chown -R 1001:1001 /app/.next

USER 1001
EXPOSE 3000
CMD ["node", "server.js"]
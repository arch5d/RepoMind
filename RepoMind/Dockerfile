FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache git

# Dependencies layer
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only-production

# Development layer
FROM base AS development
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build layer
FROM deps AS builder
COPY . .
RUN npm run build

# Production layer
FROM base AS production
RUN addgroup --system --gid 1001 repomind
RUN adduser --system --uid 1001 repomind
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
USER repomind
EXPOSE 3000
CMD ["npm", "start"]

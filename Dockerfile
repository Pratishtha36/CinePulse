# ==========================================
# Stage 1: Build Frontend Client
# ==========================================
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend Application
# ==========================================
FROM node:20-alpine AS server-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate
COPY . .
RUN npm run build --if-present

# ==========================================
# Stage 3: Production Runtime
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

# Copy built server output and built client static files
COPY --from=server-builder /app/src ./src
COPY --from=server-builder /app/tsconfig.json ./tsconfig.json
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 5001

USER node

CMD ["dumb-init", "npx", "tsx", "src/server.ts"]

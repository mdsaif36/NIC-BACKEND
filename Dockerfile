# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL deps (including devDeps for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create uploads directories (bind-mounted in production)
RUN mkdir -p uploads/resumes uploads/screenshots uploads/referrals

# Non-root user for security
RUN addgroup -S nic && adduser -S nic -G nic
RUN chown -R nic:nic /app/uploads
USER nic

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

# ============================================================
# 1. BASE
# ============================================================
FROM node:22-alpine AS base

WORKDIR /app

RUN npm install -g npm@11.19.1


# ============================================================
# 2. DEPENDENCIES
# ============================================================
FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci


# ============================================================
# 3. BUILDER
# ============================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# API URL HARUS tersedia saat next build
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN echo "========================================"
RUN echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
RUN echo "========================================"

RUN npm run build -- --webpack


# ============================================================
# 4. RUNNER
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# User non-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Public assets
COPY --from=builder /app/public ./public

# Next standalone
COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/standalone ./

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
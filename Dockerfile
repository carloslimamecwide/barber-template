# Stage 1: Build
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .

# Next.js avalia os módulos das Route Handlers durante o build. Estes valores
# são apenas sintáticos: o adapter não abre uma ligação nesta fase e o runner
# recebe as credenciais reais através do env_file/secret store.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
ENV SESSION_SECRET="build-only-session-secret-not-used-at-runtime"
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/next.config.* ./

EXPOSE 3000

CMD ["npm", "start"]

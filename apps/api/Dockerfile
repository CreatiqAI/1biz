FROM node:20-alpine

RUN apk add --no-cache libc6-compat netcat-openbsd
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy the entire monorepo (needed to resolve pnpm workspace dependencies)
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client (must run before tsc to get correct types)
RUN pnpm --filter @1biz/api exec prisma generate

# Build shared package first, then API
RUN pnpm --filter @1biz/shared build
RUN pnpm --filter @1biz/api build

ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/api

# Run DB migrations then start the server
CMD ["sh", "-c", "until nc -z postgres 5432; do echo 'Waiting for postgres...'; sleep 2; done && node_modules/.bin/prisma migrate deploy && node dist/main"]

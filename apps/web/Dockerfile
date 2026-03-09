FROM node:20-alpine

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy the entire monorepo (needed to resolve pnpm workspace dependencies)
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @1biz/shared build

# NEXT_PUBLIC_API_URL: relative '/api/v1' — browser calls go through Next.js rewrites.
# API_INTERNAL_URL: must be set at BUILD time because next.config.ts rewrites()
# is evaluated during `next build` and written to routes-manifest.json.
ENV NEXT_PUBLIC_API_URL=/api/v1
ENV API_INTERNAL_URL=http://api:3001
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @1biz/web build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

WORKDIR /app/apps/web

CMD ["node_modules/.bin/next", "start", "-p", "3000"]

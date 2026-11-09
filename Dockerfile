# Next.js + Prisma (SQLite on a Fly volume mounted at /data)
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Prisma's query engine needs OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
# full node_modules: the prisma CLI is needed at start for `migrate deploy`
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
# Migrate here, not in a Fly release_command: release machines don't mount the volume holding the SQLite file
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p $PORT"]

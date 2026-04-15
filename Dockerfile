FROM node:20 AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20 AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Puerto por defecto dentro del contenedor
ENV PORT=3006

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma

EXPOSE 3006
# Aseguramos permisos de escritura incluso cuando se monta el volumen sqlite_data
RUN chown -R node:node /app

# In production we avoid running automatic prisma migrations in the container
# because migration histories may target a different provider (dev vs prod).
# Start Next.js directly; run migrations manually or from your CI if needed.
CMD ["sh", "-c", "npm run start -- -H 0.0.0.0 -p $PORT"]

FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm install
COPY prisma ./prisma
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npx prisma generate
RUN cd apps/api && npx nest build
RUN npm prune --production

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/packages ./packages
COPY apps/api/package.json ./apps/api/
COPY package.json ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node apps/api/dist/apps/api/src/main"]

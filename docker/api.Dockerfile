FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @starter/api...
RUN pnpm --filter @starter/api... build
RUN pnpm --filter @starter/api deploy --prod /app

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=4000 HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

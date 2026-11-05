# ---- stage 1: dependencies install karo ----
FROM node:22-alpine AS deps
WORKDIR /app
# pehle sirf package files: code badalne pe npm ci dobara nahi chalega (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- stage 2: chhoti, saaf runtime image ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node server.js package.json ./
# root ki jagah normal user
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
# exec form: node ko seedha SIGTERM milta hai
CMD ["node", "server.js"]

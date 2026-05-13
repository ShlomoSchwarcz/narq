# FROM node:20-alpine AS builder

# WORKDIR /app
# COPY package*.json tsconfig.json ./
# RUN npm install
# COPY src ./src
# RUN npm run build

# FROM node:20-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm install --production
# COPY --from=builder /app/dist ./dist
# EXPOSE 3001
# # CMD ["node", "dist/index.js"]
# CMD ["npm", "run", "prod"]
# # CMD ["npm", "run", "debug"]


FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                  # install ALL deps including devDeps
COPY . .
RUN npm run build           # tsc now available

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl wget && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev       # production only
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
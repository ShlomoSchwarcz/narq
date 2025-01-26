# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM node:20-alpine
WORKDIR /app
# Copy the build output from the previous stage
COPY --from=build /app/build ./build
# Install a simple static server
RUN npm install -g serve

EXPOSE 8080
CMD ["serve", "-s", "build", "-l", "8080"]

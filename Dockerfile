# Build stage
FROM docker.io/library/node:22-alpine AS builder

WORKDIR /src

# 複製 package files
COPY package.json package-lock.json ./

# 安裝依賴（不更新 npm，node:22 已有足夠新的版本）
RUN npm ci

# 複製源碼
COPY . .

# 構建應用
RUN npm run build

# Serve stage - 使用 Node HTTP Server
FROM docker.io/library/node:22-alpine

WORKDIR /app

# 安裝 http-server 用於提供靜態文件
RUN npm install -g http-server

# 從 builder 複製構建結果
COPY --from=builder /src/dist ./dist

EXPOSE 8080

# 提供 dist 文件夾中的靜態文件
CMD ["http-server", "dist", "-p", "8080", "--gzip"]

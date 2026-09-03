FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 路由从静态页改为鉴权动态页时，必须清掉上一层镜像残留的 Next 构建缓存。
RUN rm -rf .next && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# standalone 中的 server.js 与 .next/static 必须来自同一次构建，避免页面引用不存在的 CSS/JS 文件。
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# 旧页面缓存曾引用该 CSS 名称。保留兼容副本，避免发布期间旧 HTML 因资源哈希切换而退化为纯文字页面。
RUN css_file=$(find .next/static/chunks -type f -name '*.css' | head -n 1) \
  && test -n "$css_file" \
  && cp "$css_file" .next/static/chunks/0qzkk89mu3ll-.css
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

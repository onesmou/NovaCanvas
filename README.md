# NovaCanvas

NovaCanvas 是面向亚马逊跨境电商团队的 AI 商品图片工作台，支持公司自有账号、项目管理与 OpenAI / Gemini 图片生成接口。

## 自托管部署

推荐使用 Ubuntu 24.04 LTS、宝塔面板和 Docker Compose。

完整中文部署流程见 [部署教程.md](./部署教程.md)。

部署前：

1. 复制 `.env.example` 为 `.env`。
2. 填写 PostgreSQL 密码、管理员账号、正式域名和至少一个图片生成 API 密钥。
3. 在项目目录执行 `docker compose up -d --build`。

请勿提交 `.env` 或任何 API 密钥。

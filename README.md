# shareid · 苹果账号展示站

从主站（faka / Luffyid）拆出的**纯展示**项目：各地区共享账号列表 + FAQ，数据来自 AppleAuto 托管 API。

## 开发

```bash
cd D:\shareid
npm install
copy .env.example .env
# 编辑 .env 填写 SHOWCASE_APPLE_AUTO_* 与 SHOWCASE_TAG_*

npm run dev
```

打开 <http://localhost:3000>。

## 部署

- 将域名（如 `pcyid.store`）DNS 指向本应用；**勿**再指到主商城。
- 生产环境设置与 `.env.example` 相同变量。
- `npm run build` && `npm run start`（或 Vercel / Docker 等）。

## 与主站关系

- **无数据库**、无登录、无商城逻辑。
- 原主站 `src/app/showcase`、`src/app/api/showcase` 已移除时，展示流量只进本项目。

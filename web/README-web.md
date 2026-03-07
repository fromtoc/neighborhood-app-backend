# GoLocal Web

Next.js 14 App Router + TypeScript，與既有 Spring Boot backend 共用資料。

## 快速啟動

```bash
cd web
cp .env.example .env.local   # 填入實際值
npm install
npm run dev
# → http://localhost:3000
```

## 環境變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `API_BASE_URL` | Backend URL（Server 端用，不暴露給瀏覽器） | `http://localhost:8080` |
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL（瀏覽器端 fetch 用） | `http://localhost:8080` |
| `REVALIDATE_TOKEN` | ISR revalidate 保護用 secret（Step 19 啟用） | `change-me-secret` |

## 目錄結構

```
web/
├── app/                  App Router 路由
│   ├── layout.tsx        全站 layout（header/footer）
│   ├── page.tsx          首頁（縣市列表，ISR 1h）
│   ├── globals.css       全域樣式
│   └── error.tsx         全站 error boundary
├── lib/
│   └── api.ts            Backend fetch wrapper（apiFetch / clientFetch）
├── .env.example          環境變數範本
├── next.config.mjs
├── tsconfig.json
└── README-web.md
```

## 開發指令

```bash
npm run dev      # 開發模式（port 3000）
npm run build    # 生產 build
npm run start    # 生產啟動
npm run lint     # ESLint 檢查
npm run format   # Prettier 格式化
```

## 部署

- **Vercel（建議）**：連結 GitHub repo，設定 Root Directory = `web`，填入環境變數即可自動部署。
- **自架**：`npm run build && npm run start`，需要 Node.js 18+。

## Backend 健康確認

首頁會呼叫 `GET /api/v1/neighborhoods/cities` 並顯示連線狀態。
若顯示「Backend 連線正常」即代表 API_BASE_URL 設定正確。

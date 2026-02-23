# law119 (Legal Marketplace Platform)

`law119` 是一个面向华人法律服务场景的律师接单平台，定位为“华人律师版的 Avvo + LegalMatch 结合体”。

当前版本已经包含：
- 客户发布案件、律师报价、客户选律师
- 聊天沟通、举报/黑名单、争议工单、客服工单
- 委托确认（服务边界/冲突检查）
- 支付/托管（MVP 状态机 + 财务审核后台）
- 律师信任体系（实名认证/Bar 验证/徽章/评价/Trust Score）
- 后台运营工作台（案件、风控、客服、审计、内容、财务）

## Tech Stack

- `Next.js 15` (App Router)
- `React 19`
- `Prisma + Postgres (Supabase)`
- `Supabase Auth + Storage`
- `Tailwind CSS`
- `TypeScript`

## Local Setup

### 1) Requirements

- Node.js `20+`
- npm
- Docker Desktop（本地 Supabase）
- Supabase CLI（如果使用 `supabase start`）

### 2) Environment

复制环境变量模板：

```bash
cp .env.example .env.local
```

至少要配置（前端登录/鉴权会用到）：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

后端常用（按需）：
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `RESEND_API_KEY`（如果测邮件通知）
- `RESEND_FROM_EMAIL`

### 3) Install & Prisma

```bash
npm install
npx prisma generate
```

如果本地数据库已启动，执行迁移：

```bash
npx prisma migrate dev
npm run prisma:check-marketplace
```

### 4) Start Dev Server

```bash
npm run dev
```

打开：
- [http://127.0.0.1:3000](http://127.0.0.1:3000)

## Local Supabase (Optional but Recommended)

启动本地 Supabase：

```bash
supabase start
```

然后再执行 Prisma 迁移：

```bash
npx prisma migrate dev
```

## Test Accounts (Local Dev)

### Admin
- 登录页：`/auth/sign-in?role=admin&mode=signin`
- 邮箱：`admin.051343@law119.local`
- 密码：`Law119!042634b6`

### Attorney
- 登录页：`/auth/sign-in?role=attorney&mode=signin`
- 邮箱：`attorney.1771810466904@law119.local`
- 密码：`Law119!d0418003A`

### Dev Quick Login (Recommended for local testing)
- `/dev/quick-login`
- 支持一键切换：`CLIENT / ATTORNEY / ADMIN`

> 注意：以上账号仅用于本地开发环境。

## Key Entry Points

### Client
- 客户后台：`/client/dashboard`
- 客户消息中心：`/marketplace/client-conversations`
- 支持中心：`/marketplace/support-center`
- 客服消息单：`/marketplace/support-tickets`

### Attorney
- 律师总控台：`/attorney/dashboard`
- 会话中心：`/attorney/conversations`
- 任务中心：`/attorney/tasks`
- 数据分析：`/attorney/analytics`
- 报价模板：`/attorney/bid-templates`
- 律师公开品牌页列表：`/attorneys`

### Admin
- 管理后台看板：`/marketplace/admin/dashboard`
- 统一工单台：`/marketplace/admin/support-inbox`
- 律师审核队列：`/marketplace/admin/attorney-reviews`
- 律师质量控制台：`/marketplace/admin/attorney-quality`
- 财务运营台：`/marketplace/admin/finance-ops`
- 审计中心：`/marketplace/admin/audit`

## Scripts

```bash
npm run dev                 # 启动开发服务器
npm run build               # 生产构建
npm run start               # 生产启动
npm run prisma:check-marketplace
npm run test:e2e            # Playwright E2E（需安装浏览器）
```

## CI (GitHub Actions)

仓库已包含基础 CI：
- `npm ci`
- `npx prisma generate`
- `npx tsc --noEmit`

位置：
- `.github/workflows/ci.yml`

## Notes

- `.env` / `.env.local` 已在 `.gitignore` 中排除，不会提交到仓库。
- 本地开发如果 Prisma schema 更新后接口出现奇怪报错（例如新模型未识别），请重启 `next dev`。
- 支付模块目前是 **MVP 状态机/审核流**，未接真实支付网关（Stripe/Square）。

## Repository Status

- 当前里程碑建议标签：`v0.1.0-mvp`
- 包含客户端、律师端、管理员后台、风控、信任体系、财务审核等核心功能骨架

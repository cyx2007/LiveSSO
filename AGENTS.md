# HFLive Auth Agent Guide

本文件是整个 `live_oss` 项目的 Codex/AI 开发约束。它保存应在每次开发任务中自动生效的规则；项目事实、架构说明和阶段进度统一维护在 `docs/`，不要把长篇开发日志堆进本文件。

## 开始任务前

1. 先阅读 `docs/README.md`，再按其中的文档地图读取与任务相关的文档。
2. 阅读相关实现、测试、迁移和配置后再修改，不依据旧计划猜测当前代码。
3. 检查当前工作区状态。该目录初始阶段可能尚未初始化 Git；进行 Git 操作前必须重新确认。
4. `/Users/xiang/Desktop/liveboard` 是独立项目。除非任务明确包含 LiveBoard 接入，否则不要修改它。

## 产品与协议不变量

- 官方 OIDC issuer 固定为 `https://auth.hsfz.live`；上线后不得随意增加路径或更换域名。
- 平台只服务 HFLive 组织内及管理员批准的成员项目，不开放第三方自助接入。
- 禁止公开注册，禁止 dynamic client registration；账号和 OIDC client 必须走管理员控制流程。
- 主要登录方式为“用户名或邮箱 + 密码”；风险登录追加邮箱验证码。TOTP 只保留扩展能力，默认关闭。
- 全局身份平台管理用户名、邮箱、显示名、头像和账号状态；接入应用继续管理自己的角色和业务权限。
- v1 不实现 SAML、SCIM、社交登录、Passkey 或 SQLite。
- LiveBoard 未来支持 `local | hybrid | hflive_oidc`，非官方实例可继续本地登录。

如果需求会改变上述不变量，先更新设计文档并向用户明确说明协议、安全或迁移影响，不要静默改变。

## 技术基线

- Node.js 22、pnpm 11、Next.js App Router、React、TypeScript。
- Better Auth + OAuth Provider 提供认证和 OAuth 2.1/OIDC 基础。
- Prisma 7 + PostgreSQL；运行时使用 driver adapter，不支持 SQLite。
- 官方部署目标为 Vercel + 托管 PostgreSQL + R2 + HTTP API 邮件服务。
- 自部署使用 Docker Compose + PostgreSQL + S3/MinIO；开发邮件使用 Mailpit。
- Serverless 路径不得依赖进程内状态。限流、challenge、token 状态和可靠事件必须使用数据库或外部持久化服务。

## 安全要求

- 不得在日志、测试输出、错误信息、文档或提交中记录密码、OTP、session token、authorization code、access/refresh token、client secret、私钥或生产连接串。
- 密码必须使用 Better Auth 的密码处理能力；token、验证码、设备令牌和 client secret 按设计只保存摘要或受控密文。
- 账号、邮箱、用户名和登录失败响应不得形成明显的用户枚举通道。
- redirect URI 必须精确匹配白名单；不得用宽泛通配符简化接入。
- 管理员权限和应用角色不得由 OIDC JIT 登录自动授予。
- 修改 cookie、issuer、JWKS、token TTL、认证回调或账号关联逻辑时，必须评估现有会话、密钥轮换和回滚影响。
- `.env` 只允许本地 disposable 配置；文档和示例只能使用占位符。部署不得复用仓库中的开发 secret 或本地 Docker volume。

## 数据库与认证 schema

- `prisma/schema.prisma` 同时包含 Better Auth 表和 HFLive 领域表。
- Better Auth CLI 的 schema generate 可能覆盖 Prisma schema。执行前先确认目的，执行后必须逐行审查 diff；加入自定义领域模型后，不得无审查覆盖。
- 每次 schema 变更都要创建 Prisma migration，不接受只运行 `db push` 作为持久实现。
- 迁移必须可在空数据库和已有数据库上安全执行；涉及 token/challenge 消费时要考虑事务、唯一约束和并发竞争。
- Prisma 运行时使用 `DATABASE_URL`，迁移使用 `DIRECT_DATABASE_URL`。Serverless 官方环境应区分 pooled URL 与 direct URL。

## 开发与验证

常用命令：

```bash
pnpm dev
pnpm validate
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm oidc:smoke
docker compose --profile app up -d --build
```

最低验证要求：

- 普通 TypeScript/服务端改动：`pnpm validate`。
- Next.js 路由、构建配置或依赖改动：再运行 `pnpm build`。
- Prisma schema 改动：生成 migration，并验证 `prisma migrate deploy` 路径。
- 认证、OIDC、claims、token 或 consent 改动：运行完整 `pnpm oidc:smoke`，不能只测试 HTTP 200。
- Docker/自部署改动：实际构建镜像，确认 migrator 成功退出且 readiness 返回 200。
- UI 改动：在真实浏览器检查目标页面；至少覆盖桌面和移动断点、键盘操作、错误状态与横向溢出。

不要为了让验证变绿而关闭 lint、类型检查、安全校验或协议断言。先定位版本不兼容、环境缺失或实现缺陷。

## 本地环境约定

- Web：`3000`
- PostgreSQL：`55432`
- Mailpit SMTP/UI：`51025` / `58025`
- MinIO API/Console：`59000` / `59001`

Next.js watcher 在本机可能触发 `EMFILE`，当前 `pnpm dev` 已使用 `WATCHPACK_POLLING=true`。不要因此更换 `.next` 目录或删除运行中的构建目录。

启动或停止服务前先检查已有容器和端口，避免影响其他项目。测试产生的本地账号、OIDC client 和 volume 均视为 disposable，不得当作生产初始化数据。

## UI/UX 方向

- 深色优先；参考 Cloudflare 的信息密度、Apple 的克制、Claude 的温和排版。
- 科技/黑客感来自网格、终端状态、细边框、适度辉光和清晰层级，不使用影响可读性的噪声或过度动画。
- UI 不需要模仿 LiveBoard，但认证流程必须保持可信、安静、明确。
- 可访问性、移动端、错误可读性和安全反馈优先于视觉装饰。

## 文档维护

- `docs/development-progress.md` 是当前阶段、完成度和下一步的唯一动态状态页。
- `docs/development-log.md` 按日期追加已经发生的工作、验证和故障修正，不重写历史结论。
- `docs/architecture.md` 保存稳定架构、数据归属和安全边界。
- `docs/local-development.md` 保存可执行的开发/验证说明。
- 根目录 `IMPLEMENTATION_PLAN.md` 是总体实施基线，`PHASE_1_STATUS.md` 是 Phase 1 历史验收快照。

行为、部署、环境变量、协议或验证方式发生变化时，必须在同一任务中更新对应文档。代码注释只解释局部“为什么”，不要代替项目文档。


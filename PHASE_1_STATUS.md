# Phase 1 实施状态

日期：2026-08-09  
结论：第一阶段工程与 OIDC 技术验证已完成，尚不可投入生产。

## 已实现

- Next.js 16 App Router、React 19、TypeScript 6、pnpm 工程
- Prisma 7 + PostgreSQL driver adapter 与首个可重复迁移
- Better Auth 密码认证、username 插件和数据库限流
- OAuth Provider 的 OIDC discovery、OAuth metadata、授权码 + PKCE、consent、token、userinfo、introspection、revocation 和 end-session 基础端点
- 根域 issuer 契约；本地为 `http://localhost:3000`，官方环境设置后为 `https://auth.hsfz.live`
- `openid profile email offline_access` scopes 与稳定基础 claims
- EdDSA JWKS，30 天轮换与 30 天旧 key 宽限
- 动态客户端注册关闭；普通登录用户创建/修改 OAuth client 的能力暂时全部拒绝
- 用户名或邮箱单输入框登录页、授权同意页和初版深色科技风 token
- liveness/readiness、基础安全响应头和 noindex
- 初始唯一用户创建命令与完整 OIDC smoke 脚本
- Vercel 配置、standalone Dockerfile、PostgreSQL/MinIO/Mailpit Compose 依赖
- Compose 一次性 migrator；数据库迁移成功后才启动 Web 容器
- 官方/自部署环境模式与生产邮件硬性要求的配置边界

## 验证证据

- `pnpm validate`：ESLint、Prisma generate、TypeScript 和 2 个环境契约测试通过
- `pnpm build`：Next.js 生产构建通过
- `pnpm prisma migrate dev --name init`：迁移已在 PostgreSQL 17 实际创建并应用
- 首页、登录页、liveness、readiness、两份 discovery 均返回 200
- readiness 实际连接 PostgreSQL
- username 和 email 两种密码登录均实际成功
- `pnpm oidc:smoke` 完整验证 code + PKCE、state、nonce、consent、token 与 ID token claims
- Docker 镜像构建通过；构建上下文已从约 848 MB 缩小到 KB 级增量
- standalone 容器中 liveness、readiness、discovery 和完整 OIDC smoke 再次通过
- 登录用户调用客户端创建端点返回 401，符合当前默认拒绝策略
- 1280×720 浏览器检查：首页和登录页无横向溢出，控制台无 error/warning

## 本地验证数据

本地 PostgreSQL volume 中存在一个 disposable 开发用户和一个 OIDC 测试客户端，只用于完成本阶段验收；它们不在代码、迁移或 Git 文件中。部署官方环境前应使用全新数据库，不得复制本地 volume、开发密码或开发 secret。

## 尚未实现

- 管理员/角色模型、邀请制完整流程和管理后台
- 邮件供应商、邮箱 OTP、找回密码和邮件模板
- 受信设备、风险规则、登录 challenge 与审计事件
- 头像对象存储
- Directory API、outbox 与接入应用事件
- OAuth 客户端的管理员审批/维护 UI
- LiveBoard 的 `local | hybrid | hflive_oidc` 改造
- Vercel 真实环境变量、托管 PostgreSQL、R2 和邮件 API 的部署验收

## 下一阶段边界

下一步进入 Phase 2，先冻结并迁移 `Invitation`、`TrustedDevice`、`LoginChallenge`、`AuditEvent`、`ProfileAsset`、`OutboxEvent` 与管理员权限模型，同时补充并发消费和敏感数据摘要测试。完成这些领域与安全基础后，再进入邮件、邀请和风险登录界面。

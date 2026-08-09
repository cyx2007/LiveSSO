# PostgreSQL 与头像对象备份恢复

状态：本地 Compose 路径已演练  
最后更新：2026-08-09

身份数据和头像对象必须作为同一个恢复点管理。先记录 UTC 时间和当前 migration 版本，再备份 PostgreSQL 与完整私有 bucket；不要只备份其中一侧。

## Compose 备份

在受限目录创建备份，避免文件被 Web 服务公开：

```bash
backup_dir="$(mktemp -d)"
docker compose exec -T postgres pg_dump -U hflive -d hflive_auth -Fc > "$backup_dir/postgres.dump"
docker run --rm --network hflive-auth_default --entrypoint /bin/sh \
  -v "$backup_dir:/backup" minio/mc:latest \
  -c 'mc alias set source http://minio:9000 hflive hflive-development >/dev/null && mc mirror --overwrite source/hflive-auth /backup/objects'
shasum -a 256 "$backup_dir/postgres.dump" > "$backup_dir/SHA256SUMS"
find "$backup_dir/objects" -type f -exec shasum -a 256 {} \; >> "$backup_dir/SHA256SUMS"
```

生产环境不得使用示例 MinIO 凭据。使用 secret manager 注入源与目标凭据，命令历史和日志不得出现数据库 URL、S3 secret 或用户 token。备份目录应加密并限制访问。

## 隔离恢复演练

始终先恢复到空数据库和空 bucket，不要覆盖正在运行的生产实例：

```bash
restore_db="hflive_auth_restore_check"
restore_bucket="hflive-auth-restore-check"
docker compose exec -T postgres createdb -U hflive "$restore_db"
docker compose exec -T postgres pg_restore -U hflive -d "$restore_db" --clean --if-exists < "$backup_dir/postgres.dump"
docker run --rm --network hflive-auth_default --entrypoint /bin/sh \
  -v "$backup_dir:/backup" minio/mc:latest \
  -c 'mc alias set target http://minio:9000 hflive hflive-development >/dev/null && mc mb --ignore-existing target/hflive-auth-restore-check && mc mirror --overwrite /backup/objects target/hflive-auth-restore-check'
```

核验：

```bash
docker compose exec -T postgres psql -U hflive -d "$restore_db" -c 'select count(*) from "user";'
docker compose exec -T postgres psql -U hflive -d "$restore_db" -c 'select count(*) from "profileAsset";'
docker run --rm --network hflive-auth_default --entrypoint /bin/sh minio/mc:latest \
  -c 'mc alias set target http://minio:9000 hflive hflive-development >/dev/null && mc ls --recursive target/hflive-auth-restore-check'
```

随后用恢复环境自己的 secret 启动单个隔离 app，验证 readiness、既有登录、OIDC discovery/JWKS、一个仍在保留期内的头像 URL 和一次新头像替换。JWKS 私钥由 `BETTER_AUTH_SECRET` 加密；缺少原 secret 时不能通过关闭加密绕过。

## 切换与回滚

- 暂停写入与 outbox worker，记录最后事件 ID，完成最终增量备份。
- 将应用切到恢复后的 PostgreSQL 与 bucket，再执行 `prisma migrate deploy`；不能对恢复库运行 `db push`。
- readiness、登录、OIDC smoke、头像和 webhook 全部通过后再恢复流量与 worker。
- 保留旧数据库和 bucket 为只读，直到观察窗口结束。失败时停止新实例，切回原连接并核对恢复期间是否产生需要人工合并的新写入。
- 演练结束后只删除明确命名的隔离数据库/bucket，不删除真实备份或生产资源。

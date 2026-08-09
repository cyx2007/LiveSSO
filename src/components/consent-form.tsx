"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const scopeDescriptions: Record<string, string> = {
  openid: "确认你的 HFLive 身份",
  profile: "读取显示名、用户名与头像",
  email: "读取邮箱及其验证状态",
  offline_access: "在你离开后维持已授权的会话",
};

export function ConsentForm() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client_id") ?? "未知应用";
  const scopes = (searchParams.get("scope") ?? "openid")
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);
  const [pending, setPending] = useState<"accept" | "deny">();
  const [error, setError] = useState<string>();

  async function decide(accept: boolean) {
    setPending(accept ? "accept" : "deny");
    setError(undefined);

    const result = await authClient.oauth2.consent({
      accept,
      scope: accept ? scopes.join(" ") : undefined,
    });

    if (result.error) {
      setError("授权请求已失效或无法处理，请返回应用后重试。");
      setPending(undefined);
      return;
    }

    if (result.data?.url) {
      window.location.assign(result.data.url);
      return;
    }

    setError("授权服务没有返回跳转地址，请重试。");
    setPending(undefined);
  }

  return (
    <>
      <div className="client-id">
        <span>Client</span>
        <code>{clientId}</code>
      </div>

      <ul className="scope-list">
        {scopes.map((scope) => (
          <li key={scope}>
            <span className="scope-dot" aria-hidden="true" />
            <span>
              <strong>{scope}</strong>
              <small>{scopeDescriptions[scope] ?? "访问此应用申请的内部能力"}</small>
            </span>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="button-row">
        <button className="secondary-button" type="button" onClick={() => decide(false)} disabled={Boolean(pending)}>
          {pending === "deny" ? "正在拒绝…" : "拒绝"}
        </button>
        <button className="primary-button" type="button" onClick={() => decide(true)} disabled={Boolean(pending)}>
          {pending === "accept" ? "正在授权…" : "允许访问"}
        </button>
      </div>
    </>
  );
}


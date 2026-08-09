"use client";
import { useState, type FormEvent } from "react";
export function InvitationAdminForm() {
  const [message, setMessage] = useState<string>(); const [error, setError] = useState<string>(); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(undefined); setError(undefined);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email") }) });
    setPending(false);
    if (!response.ok) return setError("无法发送邀请。请确认管理员权限、邮件配置以及该邮箱是否已有待处理邀请。");
    event.currentTarget.reset(); setMessage("邀请已发送，有效期 7 天。");
  }
  return <form onSubmit={submit}><div className="field"><label htmlFor="email">成员邮箱</label><input id="email" name="email" type="email" required /></div>
    {message ? <p className="form-success" role="status">{message}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="primary-button" disabled={pending}>{pending ? "正在发送…" : "发送邀请"}</button></form>;
}

"use client";

import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true);
    const data = new FormData(event.currentTarget);
    await fetch("/api/auth/request-password-reset", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), redirectTo: `${window.location.origin}/reset-password` }),
    });
    setPending(false); setDone(true);
  }
  if (done) return <p className="form-success" role="status">如果该邮箱对应有效账号，你会收到一封重置邮件。请检查收件箱。</p>;
  return <form onSubmit={submit}>
    <div className="field"><label htmlFor="email">账号邮箱</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
    <button className="primary-button" disabled={pending}>{pending ? "正在提交…" : "发送重置邮件"}</button>
  </form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(undefined);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, newPassword: data.get("password") }),
    });
    setPending(false);
    if (!response.ok) return setError("重置链接无效、已过期或密码不符合要求。");
    setDone(true);
  }
  if (done) return <p className="form-success" role="status">密码已重置，其他会话已撤销。现在可以 <a href="/sign-in">登录</a>。</p>;
  return <form onSubmit={submit}>
    <div className="field"><label htmlFor="password">新密码</label><input id="password" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="primary-button" disabled={pending}>{pending ? "正在重置…" : "重置密码"}</button>
  </form>;
}

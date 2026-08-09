import type { Metadata } from "next";
import { InvitationAcceptForm } from "@/components/invitation-accept-form";

export const metadata: Metadata = { title: "接受邀请" };

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <main className="auth-main"><section className="panel auth-card">
    <p className="eyebrow">Invitation</p><h1 className="auth-title">创建 HFLive 账号</h1>
    <p className="auth-copy">设置全局用户名、显示名和密码。邀请链接只能使用一次。</p>
    {token ? <InvitationAcceptForm token={token} /> : <p className="form-error" role="alert">邀请链接不完整。</p>}
  </section></main>;
}

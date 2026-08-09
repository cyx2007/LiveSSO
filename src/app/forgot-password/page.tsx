import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/password-recovery-forms";
export const metadata: Metadata = { title: "找回密码" };
export default function ForgotPasswordPage() { return <main className="auth-main"><section className="panel auth-card">
  <p className="eyebrow">Recovery</p><h1 className="auth-title">找回密码</h1>
  <p className="auth-copy">提交后始终显示相同结果，避免泄露账号是否存在。</p><ForgotPasswordForm />
</section></main>; }

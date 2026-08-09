import type { Metadata } from "next";
import { ChallengeForm } from "@/components/challenge-form";
export const metadata: Metadata = { title: "验证登录" };
export default function VerifyLoginPage() { return <main className="auth-main"><section className="panel auth-card">
  <p className="eyebrow">Risk check</p><h1 className="auth-title">验证此次登录</h1>
  <p className="auth-copy">验证码已发送到你的账号邮箱。为避免账号枚举，这里不会显示邮箱地址。</p><ChallengeForm />
</section></main>; }

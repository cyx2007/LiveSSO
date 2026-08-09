import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsentForm } from "@/components/consent-form";

export const metadata: Metadata = {
  title: "授权确认",
};

export default function ConsentPage() {
  return (
    <main className="auth-main">
      <section className="panel auth-card">
        <p className="eyebrow">Authorization request</p>
        <h1 className="auth-title">确认应用访问</h1>
        <p className="auth-copy">此应用希望访问下面的信息。只应授权你认识且正在使用的 HFLive 应用。</p>
        <Suspense fallback={<p className="auth-copy">正在读取授权请求…</p>}>
          <ConsentForm />
        </Suspense>
      </section>
    </main>
  );
}

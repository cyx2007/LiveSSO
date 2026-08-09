export default function Home() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          HFLive Auth
        </div>
        <span className="environment">identity / internal</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">HFLive identity network</p>
          <h1>One identity. Every HFLive project.</h1>
          <p className="lead">
            为 HFLive 内部项目提供统一、可控的身份入口。账户由组织邀请创建，应用接入由管理员审批。
          </p>
        </div>

        <aside className="panel" aria-label="服务状态">
          <div className="status-row">
            <span>Issuer</span>
            <span className="status-value">auth.hsfz.live</span>
          </div>
          <div className="status-row">
            <span>Protocol</span>
            <span className="status-value">OIDC + PKCE</span>
          </div>
          <div className="status-row">
            <span>Registration</span>
            <span className="status-value">INVITE ONLY</span>
          </div>
          <div className="status-row">
            <span>System</span>
            <span className="status-value online">● BOOTSTRAPPING</span>
          </div>
        </aside>
      </section>
    </main>
  );
}


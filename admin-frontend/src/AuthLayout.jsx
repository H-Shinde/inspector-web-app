import logo from './bison_logo__login.png';
import './App.css';

export default function AuthLayout({ title, description, children }) {
  return (
    <main className="auth_page">
      <section className="auth_card" aria-labelledby="auth-title">
        <svg className="auth_logo" viewBox="26 21 220 163" role="img" aria-label="Bison Valuation">
          <image href={logo} width="396" height="304" />
        </svg>
        <div className="auth_heading">
          <p className="auth_eyebrow">BISON VALUATION</p>
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </section>
      <p className="auth_footer">Bison Valuation · Inspection &amp; appraisal management</p>
    </main>
  );
}

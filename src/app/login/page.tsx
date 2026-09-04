import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <BrandMark href="/" />
        <div>
          <p className="eyebrow eyebrow--light">SECURE RIDER & OPERATIONS ACCESS</p>
          <h1>Ready for every mile.</h1>
          <p>Use the VMC account issued to you by Valhalla Motorcycles.</p>
        </div>
        <p className="auth-brand-panel__note">VMC · Pretoria–Midrand</p>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">VMC PLATFORM</p>
          <h2>Sign in</h2>
          <p className="page-description">Access is available only to authorized VMC drivers, staff and administrators.</p>
          {error === "auth_callback" && <p className="form-message form-message--error">We could not complete that sign-in. Please try again.</p>}
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-header content-width">
        <BrandMark />
        <Link className="text-link" href="/login">Secure sign in</Link>
      </header>
      <section className="landing-hero content-width">
        <div className="landing-hero__copy">
          <p className="eyebrow eyebrow--light">PRETORIA · MIDRAND</p>
          <h1>Built for the road ahead.</h1>
          <p>The secure operating platform for Valhalla Motorcycles and its HERO delivery-rider fleet.</p>
          <Link className="button button--light" href="/login">Sign in to VMC</Link>
        </div>
        <div className="motorcycle-silhouette" aria-hidden="true">
          <span className="silhouette-wheel silhouette-wheel--left" />
          <span className="silhouette-wheel silhouette-wheel--right" />
          <span className="silhouette-frame" />
          <span className="silhouette-seat" />
          <span className="silhouette-handle" />
          <span className="silhouette-headlight" />
        </div>
      </section>
      <footer className="landing-footer content-width">
        <span>VMC Platform</span>
        <span>Secure access for authorized drivers and staff</span>
      </footer>
    </main>
  );
}

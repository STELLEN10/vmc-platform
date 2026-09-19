import Link from "next/link";
import Image from "next/image";

import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-header content-width">
        <BrandMark />
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link className="text-link" href="/driver/login">
            Driver Sign In
          </Link>
          <Link
            className="text-link"
            href="/management/login"
            style={{ fontWeight: 600, color: "white", background: "rgba(255,255,255,0.12)", padding: "0.35rem 0.8rem", borderRadius: "0.35rem" }}
          >
            Management Portal
          </Link>
        </div>
      </header>

      <section className="landing-hero content-width">
        <div className="landing-hero__copy">
          <p className="eyebrow eyebrow--light">PRETORIA · MIDRAND</p>
          <h1>Built for the road ahead.</h1>
          <p>
            The dedicated operating platform for Valhalla Motorcycles and its HERO delivery-rider fleet.
          </p>

          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
            <Link className="button button--light" href="/driver/login">
              Driver Portal
            </Link>
            <Link
              className="button"
              href="/management/login"
              style={{ background: "#0b2545", color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              Management Console
            </Link>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <Link href="/driver/register" className="text-link" style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
              New rider? Apply to become a VMC delivery driver →
            </Link>
          </div>
        </div>

        <div className="landing-hero__bike">
          <Image
            src="/hero-eco-150.jpg"
            alt="Red HERO Eco 150 delivery motorcycle"
            width={2180}
            height={1750}
            priority
            sizes="(max-width: 760px) 94vw, 48vw"
          />
        </div>
      </section>

      <footer className="landing-footer content-width">
        <span>VMC Platform</span>
        <span>Dedicated portals for delivery drivers and operations management</span>
      </footer>
    </main>
  );
}

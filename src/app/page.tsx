import Link from "next/link";
import Image from "next/image";

import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-header content-width">
        <BrandMark />
        <Link className="text-link" href="/driver/login">
          Driver Sign In
        </Link>
      </header>

      <section className="landing-hero content-width">
        <div className="landing-hero__copy">
          <p className="eyebrow eyebrow--light">PRETORIA · MIDRAND</p>
          <h1>Road to Ownership.</h1>
          <p>
            The dedicated VMC platform for HERO delivery riders — built to keep your motorcycle, payments, service, and important notices in one place.
          </p>

          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
            <Link className="button button--light" href="/driver/login">
              Driver Sign In
            </Link>
            <Link
              className="button"
              href="/driver/register"
              style={{ background: "#191919", color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              Driver Sign Up
            </Link>
          </div>

          <p className="landing-support">
            Need help? VMC:{" "}
            <a href="tel:+27766681879">+27 76 668 1879</a>
          </p>
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
        <span>Dedicated platform for HERO delivery riders</span>
      </footer>
    </main>
  );
}

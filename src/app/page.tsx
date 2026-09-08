import Link from "next/link";
import Image from "next/image";

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
        <span>Secure access for authorized drivers and staff</span>
      </footer>
    </main>
  );
}

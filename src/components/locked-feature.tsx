import { FEATURE_CATALOG, type FeatureKey } from "@/lib/features/catalog";

export function LockedFeature({ feature }: { feature: FeatureKey }) {
  const item = FEATURE_CATALOG[feature];
  return <section className="panel foundation-callout"><div><p className="eyebrow">LOCKED · {item.release}</p><h2>{item.name}</h2><p>{item.description} This deployed module remains unavailable until a VMC administrator enables its release and feature flag.</p></div><span className="status-badge status-badge--slate">Coming soon</span></section>;
}

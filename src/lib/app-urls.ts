import "server-only";

function readAbsoluteUrl(value: string | undefined, variableName: string) {
  const raw = value?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${variableName} must be an absolute URL.`);
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error(`${variableName} must use HTTPS outside local development.`);
  }
  return url;
}

/** The canonical deployed application origin. No future VMC domain is assumed. */
export function getApplicationUrl() {
  const configured = readAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL")
    ?? readAbsoluteUrl(process.env.VMC_SITE_URL, "VMC_SITE_URL");
  if (!configured) throw new Error("NEXT_PUBLIC_APP_URL or VMC_SITE_URL is required for server-generated VMC links.");
  return configured.origin;
}

/** Optional explicit experience URLs, validated before a server can use them. */
export function getExperienceUrls() {
  const appUrl = getApplicationUrl();
  const driver = readAbsoluteUrl(process.env.NEXT_PUBLIC_DRIVER_URL, "NEXT_PUBLIC_DRIVER_URL")?.toString().replace(/\/$/, "") ?? `${appUrl}/driver`;
  const management = readAbsoluteUrl(process.env.NEXT_PUBLIC_MANAGEMENT_URL, "NEXT_PUBLIC_MANAGEMENT_URL")?.toString().replace(/\/$/, "") ?? `${appUrl}/management`;
  return { appUrl, driver, management };
}

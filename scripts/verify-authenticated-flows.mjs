import { createServerClient } from "@supabase/ssr";

const BASE_URL = "http://127.0.0.1:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-ref.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_your_project_key";

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  set(name, value) {
    this.cookies.set(name, value);
  }

  delete(name) {
    this.cookies.delete(name);
  }

  getAll() {
    return Array.from(this.cookies.entries()).map(([name, value]) => ({ name, value }));
  }

  toHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  parseSetCookie(headers) {
    const raw = headers.getSetCookie ? headers.getSetCookie() : [];
    for (const cookieStr of raw) {
      const parts = cookieStr.split(";")[0].split("=");
      const name = parts[0]?.trim();
      const value = parts.slice(1).join("=").trim();
      if (name) {
        if (value === "" || cookieStr.toLowerCase().includes("max-age=0") || cookieStr.toLowerCase().includes("expires=thu, 01 jan 1970")) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, value);
        }
      }
    }
  }
}

async function requestWithFollow(path, cookieJar, maxRedirects = 10) {
  let currentUrl = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const chain = [];

  for (let i = 0; i < maxRedirects; i++) {
    const cookieHeader = cookieJar.toHeader();
    const res = await fetch(currentUrl, {
      method: "GET",
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        "User-Agent": "VMC-Auth-Verification/1.0",
      },
      redirect: "manual",
    });

    cookieJar.parseSetCookie(res.headers);

    const status = res.status;
    const location = res.headers.get("location");
    chain.push({ url: currentUrl, status, location });

    // Check for circular redirect loops
    const visitedUrls = chain.map((c) => c.url);
    if (visitedUrls.filter((u) => u === currentUrl).length > 2) {
      throw new Error(`REDIRECT LOOP DETECTED on ${currentUrl}: chain=${JSON.stringify(chain)}`);
    }

    if (status >= 300 && status < 400 && location) {
      currentUrl = location.startsWith("http") ? location : `${BASE_URL}${location}`;
      continue;
    }

    const body = await res.text();
    return {
      status,
      finalUrl: currentUrl,
      chain,
      body,
    };
  }

  throw new Error(`Exceeded max redirects (${maxRedirects}) for ${path}`);
}

async function loginUser(email, password) {
  const jar = new CookieJar();
  const client = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (toSet) => toSet.forEach(({ name, value }) => jar.set(name, value)),
    },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`Login failed for ${email}: ${error?.message}`);
  }

  return { client, user: data.user, jar };
}

const results = [];
function report(testName, passed, details = "") {
  results.push({ testName, passed, details });
  console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${testName} ${details ? `(${details})` : ""}`);
}

async function runTests() {
  console.log("==================================================");
  console.log("   VMC AUTHENTICATED FLOWS VERIFICATION SUITE    ");
  console.log("==================================================");

  // --- PART 1: PUBLIC AUTH ROUTES OUTSIDE PROTECTED LAYOUTS ---
  const publicRoutes = [
    "/login",
    "/driver/login",
    "/management/login",
    "/management/set-password",
    "/driver/register",
    "/set-password",
    "/access-denied",
  ];

  for (const route of publicRoutes) {
    const emptyJar = new CookieJar();
    const res = await requestWithFollow(route, emptyJar);
    const noLoop = res.chain.length <= 1;
    const okStatus = res.status === 200;
    report(`Public route accessible unauthenticated: ${route}`, okStatus && noLoop, `Status: ${res.status}, Redirects: ${res.chain.length - 1}`);
  }

  // --- PART 2: UNAUTHENTICATED REDIRECTS (CLEAN, NO LOOPS) ---
  const unauthDriver = await requestWithFollow("/driver", new CookieJar());
  report(
    "Unauthenticated /driver redirects to /driver/login without loop",
    unauthDriver.finalUrl.endsWith("/driver/login") && unauthDriver.status === 200 && unauthDriver.chain.length === 2,
    `Chain: ${unauthDriver.chain.map((c) => `${c.status} -> ${c.url}`).join(" | ")}`
  );

  const unauthMgmt = await requestWithFollow("/management", new CookieJar());
  report(
    "Unauthenticated /management redirects to /management/login without loop",
    unauthMgmt.finalUrl.endsWith("/management/login") && unauthMgmt.status === 200 && unauthMgmt.chain.length === 2,
    `Chain: ${unauthMgmt.chain.map((c) => `${c.status} -> ${c.url}`).join(" | ")}`
  );

  // --- PART 3: DRIVER AUTHENTICATION & NAVIGATION FLOWS ---
  console.log("\n--- Testing Driver Authenticated Flows ---");
  const driverAuth = await loginUser("driver@vmc.test", "TestDriverPassword123!");
  report("Driver login", !!driverAuth.user, `User: ${driverAuth.user.email} (${driverAuth.user.id})`);

  // Driver -> /driver
  const driverHome = await requestWithFollow("/driver", driverAuth.jar);
  report("Driver -> /driver", driverHome.status === 200 && !driverHome.finalUrl.includes("login"), `Status: ${driverHome.status}`);

  // Driver -> /driver/payments
  const driverPayments = await requestWithFollow("/driver/payments", driverAuth.jar);
  report("Driver -> /driver/payments", driverPayments.status === 200 && !driverPayments.finalUrl.includes("login"), `Status: ${driverPayments.status}`);

  // Driver -> /driver/maintenance
  const driverMaintenance = await requestWithFollow("/driver/maintenance", driverAuth.jar);
  report("Driver -> /driver/maintenance", driverMaintenance.status === 200 && !driverMaintenance.finalUrl.includes("login"), `Status: ${driverMaintenance.status}`);

  // Driver -> /driver/emergency
  const driverEmergency = await requestWithFollow("/driver/emergency", driverAuth.jar);
  report("Driver -> /driver/emergency", driverEmergency.status === 200 && !driverEmergency.finalUrl.includes("login"), `Status: ${driverEmergency.status}`);

  // Driver -> /driver/services
  const driverServices = await requestWithFollow("/driver/services", driverAuth.jar);
  report("Driver -> /driver/services", driverServices.status === 200 && !driverServices.finalUrl.includes("login"), `Status: ${driverServices.status}`);

  // Driver -> /driver/bike
  const driverBike = await requestWithFollow("/driver/bike", driverAuth.jar);
  report("Driver -> /driver/bike", driverBike.status === 200 && !driverBike.finalUrl.includes("login"), `Status: ${driverBike.status}`);

  // Driver attempting /management -> /access-denied
  const driverAttemptMgmt = await requestWithFollow("/management", driverAuth.jar);
  const driverDeniedOk = driverAttemptMgmt.finalUrl.includes("/access-denied") && driverAttemptMgmt.status === 200;
  report(
    "Driver attempting /management -> /access-denied",
    driverDeniedOk,
    `Final URL: ${driverAttemptMgmt.finalUrl}, Status: ${driverAttemptMgmt.status}`
  );

  // --- PART 4: MANAGEMENT AUTHENTICATION & NAVIGATION FLOWS ---
  console.log("\n--- Testing Management Authenticated Flows ---");
  const mgmtAuth = await loginUser("admin@vmc.test", "TestAdminPassword123!");
  report("Management login", !!mgmtAuth.user, `User: ${mgmtAuth.user.email} (${mgmtAuth.user.id})`);

  // Management -> /management
  const mgmtHome = await requestWithFollow("/management", mgmtAuth.jar);
  report("Management -> /management", mgmtHome.status === 200 && !mgmtHome.finalUrl.includes("login"), `Status: ${mgmtHome.status}`);

  // Management -> /management/bikes
  const mgmtBikes = await requestWithFollow("/management/bikes", mgmtAuth.jar);
  report("Management -> /management/bikes", mgmtBikes.status === 200 && !mgmtBikes.finalUrl.includes("login"), `Status: ${mgmtBikes.status}`);

  // Management -> /management/payments
  const mgmtPayments = await requestWithFollow("/management/payments", mgmtAuth.jar);
  report("Management -> /management/payments", mgmtPayments.status === 200 && !mgmtPayments.finalUrl.includes("login"), `Status: ${mgmtPayments.status}`);

  // Management -> /management/maintenance
  const mgmtMaintenance = await requestWithFollow("/management/maintenance", mgmtAuth.jar);
  report("Management -> /management/maintenance", mgmtMaintenance.status === 200 && !mgmtMaintenance.finalUrl.includes("login"), `Status: ${mgmtMaintenance.status}`);

  // Management attempting /driver -> /access-denied
  const mgmtAttemptDriver = await requestWithFollow("/driver", mgmtAuth.jar);
  const mgmtDeniedOk = mgmtAttemptDriver.finalUrl.includes("/access-denied") && mgmtAttemptDriver.status === 200;
  report(
    "Management attempting /driver -> /access-denied",
    mgmtDeniedOk,
    `Final URL: ${mgmtAttemptDriver.finalUrl}, Status: ${mgmtAttemptDriver.status}`
  );

  // --- PART 5: LOGOUT & RE-LOGIN ---
  console.log("\n--- Testing Logout and Re-Login ---");
  const logoutRes = await requestWithFollow("/auth/sign-out", driverAuth.jar);
  const logoutOk = logoutRes.finalUrl.endsWith("/login") && logoutRes.status === 200;
  report("Logout -> /login", logoutOk, `Final URL: ${logoutRes.finalUrl}, Status: ${logoutRes.status}`);

  // After logout, accessing /driver should now redirect to /driver/login
  const driverAfterLogout = await requestWithFollow("/driver", driverAuth.jar);
  report(
    "After logout, /driver redirects to /driver/login",
    driverAfterLogout.finalUrl.endsWith("/driver/login") && driverAfterLogout.status === 200,
    `Final URL: ${driverAfterLogout.finalUrl}`
  );

  // Login again after logout
  const relogin = await loginUser("driver@vmc.test", "TestDriverPassword123!");
  const reloginAccess = await requestWithFollow("/driver", relogin.jar);
  report(
    "Login again after logout -> /driver access restored",
    reloginAccess.status === 200 && !reloginAccess.finalUrl.includes("login"),
    `Status: ${reloginAccess.status}`
  );

  // --- PART 6: SESSION VALIDITY ACROSS NAVIGATION & REFRESH ---
  console.log("\n--- Testing Session Persistence Across Multiple Navigations ---");
  const nav1 = await requestWithFollow("/driver/bike", relogin.jar);
  const nav2 = await requestWithFollow("/driver/payments", relogin.jar);
  const nav3 = await requestWithFollow("/driver", relogin.jar);
  const persistenceOk = nav1.status === 200 && nav2.status === 200 && nav3.status === 200;
  report("Session remains valid across consecutive page navigations", persistenceOk);

  // --- PART 7: TOKEN REFRESH & PERSISTENCE ---
  console.log("\n--- Testing Supabase Session Refresh & Cookie Persistence ---");
  const refreshRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: "refresh-d0000000-0000-4000-8000-000000000001" }),
  });
  const refreshJson = await refreshRes.json();
  report("Supabase refresh token endpoint returns valid renewed token", !!refreshJson.access_token);

  console.log("\n==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`SUMMARY: ${passed}/${total} checks passed (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

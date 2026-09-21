import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import url from "node:url";

const DRIVER_USER_ID = "d0000000-0000-4000-8000-000000000001";
const ADMIN_USER_ID = "a0000000-0000-4000-8000-000000000001";

const USERS = {
  "driver@vmc.test": {
    id: DRIVER_USER_ID,
    email: "driver@vmc.test",
    password: "TestDriverPassword123!",
    role: "authenticated",
    aud: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: { role: "driver", full_name: "Test Driver", phone: "+27000000003" },
    appRole: "driver",
  },
  "admin@vmc.test": {
    id: ADMIN_USER_ID,
    email: "admin@vmc.test",
    password: "TestAdminPassword123!",
    role: "authenticated",
    aud: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: { role: "admin", full_name: "Test Admin", phone: "+27000000001" },
    appRole: "admin",
  },
};

const PROFILES = {
  [DRIVER_USER_ID]: {
    id: DRIVER_USER_ID,
    full_name: "Test Driver",
    email: "driver@vmc.test",
    phone: "+27000000003",
    phone_number: "+27000000003",
    role: "driver",
  },
  [ADMIN_USER_ID]: {
    id: ADMIN_USER_ID,
    full_name: "Test Admin",
    email: "admin@vmc.test",
    phone: "+27000000001",
    phone_number: "+27000000001",
    role: "admin",
  },
};

const BIKES = [
  {
    id: "bike-001",
    brand: "HERO",
    model: "Eco 150",
    colour: "Red",
    registration_number: "TEST-VMC-001",
    status: "assigned",
    vin: "TESTVMCVIN00001",
    engine_number: "TESTVMCENG00001",
    current_mileage_km: 1250,
    next_service_due_km: 3000,
    licence_disc_information: "Development fixture",
    created_at: "2026-01-01T00:00:00Z",
  },
];

const DRIVERS = [
  {
    id: "drv-001",
    profile_id: DRIVER_USER_ID,
    bike_id: "bike-001",
    status: "active",
    start_date: "2026-01-01",
  },
];

const CONTRACTS = [
  {
    id: "contract-001",
    driver_id: "drv-001",
    start_date: "2026-01-01",
    weekly_amount: 500,
    total_weeks: 52,
    document_storage_path: null,
    document_file_name: null,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const PAYMENT_PERIODS = [
  {
    id: "period-001",
    contract_id: "contract-001",
    period_number: 1,
    due_date: "2026-01-08",
    amount_due: 500,
    status: "due",
  },
];

function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || "";
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const isObjectAccept = req.headers["accept"]?.includes("application/vnd.pgrst.object+json");

  // Read JSON body helper
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    let parsedBody = {};
    try {
      if (body) parsedBody = JSON.parse(body);
    } catch {}

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. Supabase Auth: Password Sign In
    if (pathname === "/auth/v1/token" && parsedUrl.query.grant_type === "password") {
      const user = USERS[parsedBody.email?.toLowerCase()];
      if (!user || user.password !== parsedBody.password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }));
        return;
      }

      const tokenPayload = {
        access_token: `token-${user.id}`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `refresh-${user.id}`,
        user: {
          id: user.id,
          email: user.email,
          role: "authenticated",
          aud: "authenticated",
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
        },
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(tokenPayload));
      return;
    }

    // 2. Supabase Auth: Refresh Token
    if (pathname === "/auth/v1/token" && parsedUrl.query.grant_type === "refresh_token") {
      const refreshToken = parsedBody.refresh_token || "";
      const userId = refreshToken.replace(/^refresh-/, "");
      const user = Object.values(USERS).find((u) => u.id === userId);

      if (!user) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Invalid refresh token" }));
        return;
      }

      const tokenPayload = {
        access_token: `token-${user.id}-refreshed`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `refresh-${user.id}`,
        user: {
          id: user.id,
          email: user.email,
          role: "authenticated",
          aud: "authenticated",
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
        },
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(tokenPayload));
      return;
    }

    // 3. Supabase Auth: Get User Profile
    if (pathname === "/auth/v1/user") {
      let user = null;
      if (token.startsWith("token-")) {
        const parts = token.split("-");
        const userId = parts.slice(1, 6).join("-");
        user = Object.values(USERS).find((u) => u.id === userId);
      }

      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid or expired JWT", code: 401 }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: user.id,
          email: user.email,
          role: "authenticated",
          aud: "authenticated",
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
        })
      );
      return;
    }

    // 4. Supabase Auth: Sign Out
    if (pathname === "/auth/v1/logout") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Helper for sending PostgREST responses
    const sendPgrst = (data) => {
      res.setHeader("Content-Type", isObjectAccept ? "application/vnd.pgrst.object+json" : "application/json");
      if (isObjectAccept) {
        const item = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
        if (!item) {
          res.writeHead(406, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify(item));
        return;
      }

      const arr = Array.isArray(data) ? data : data ? [data] : [];
      if (req.headers["prefer"]?.includes("count=exact")) {
        res.setHeader("content-range", `0-${Math.max(0, arr.length - 1)}/${arr.length}`);
      }
      res.writeHead(200);
      res.end(JSON.stringify(arr));
    };

    // 5. PostgREST: Profiles
    if (pathname === "/rest/v1/profiles") {
      const rawIdQuery = parsedUrl.query.id;
      const idMatch = typeof rawIdQuery === "string" ? rawIdQuery.replace(/^eq\./, "") : null;
      if (idMatch && PROFILES[idMatch]) {
        return sendPgrst(PROFILES[idMatch]);
      }
      return sendPgrst(Object.values(PROFILES));
    }

    // 6. PostgREST: Drivers
    if (pathname === "/rest/v1/drivers") {
      const rawProfileId = parsedUrl.query.profile_id;
      const profileId = typeof rawProfileId === "string" ? rawProfileId.replace(/^eq\./, "") : null;
      const filtered = profileId ? DRIVERS.filter((d) => d.profile_id === profileId) : DRIVERS;
      return sendPgrst(filtered);
    }

    // 7. PostgREST: Bikes
    if (pathname === "/rest/v1/bikes") {
      const rawId = parsedUrl.query.id;
      const bikeId = typeof rawId === "string" ? rawId.replace(/^eq\./, "") : null;
      const filtered = bikeId ? BIKES.filter((b) => b.id === bikeId) : BIKES;
      return sendPgrst(filtered);
    }

    // 8. PostgREST: Contracts
    if (pathname === "/rest/v1/contracts") {
      return sendPgrst(CONTRACTS);
    }

    // 9. PostgREST: Payment Periods
    if (pathname === "/rest/v1/payment_periods") {
      return sendPgrst(PAYMENT_PERIODS);
    }

    // 10. PostgREST: Other tables
    if (
      pathname === "/rest/v1/maintenance_requests" ||
      pathname === "/rest/v1/emergency_reports" ||
      pathname === "/rest/v1/service_requests" ||
      pathname === "/rest/v1/staff_profiles" ||
      pathname === "/rest/v1/management_notifications" ||
      pathname === "/rest/v1/driver_onboardings" ||
      pathname === "/rest/v1/payment_proofs" ||
      pathname === "/rest/v1/feature_flags"
    ) {
      return sendPgrst([]);
    }

    // 11. Storage Signed URLs
    if (pathname.startsWith("/storage/v1/object/sign/")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ signedUrl: "https://example.com/document.pdf" }));
      return;
    }

    sendPgrst([]);
  });
}

// Start HTTP server on 54321
const httpServer = http.createServer(handleRequest);
httpServer.listen(54321, "127.0.0.1", () => {
  console.log("Mock Supabase HTTP listening on http://127.0.0.1:54321");
});

// Start HTTPS server on 443 with TLS cert
try {
  const options = {
    key: fs.readFileSync("/tmp/key.pem"),
    cert: fs.readFileSync("/tmp/cert.pem"),
  };
  const httpsServer = https.createServer(options, handleRequest);
  httpsServer.listen(443, "127.0.0.1", () => {
    console.log("Mock Supabase HTTPS listening on https://your-project-ref.supabase.co:443");
  });
} catch (e) {
  console.warn("HTTPS listen warning:", e.message);
}

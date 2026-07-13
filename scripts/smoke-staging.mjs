const correlationId = "staging-smoke-20260713";
const endpoints = [
  {
    expectedService: "web",
    expectedStatus: "ok",
    url: `http://127.0.0.1:${process.env.STAGING_WEB_PORT ?? "3100"}/api/health`,
  },
  {
    expectedService: "web",
    expectedStatus: "ready",
    url: `http://127.0.0.1:${process.env.STAGING_WEB_PORT ?? "3100"}/api/ready`,
  },
  {
    expectedService: "realtime",
    expectedStatus: "ok",
    url: `http://127.0.0.1:${process.env.STAGING_REALTIME_PORT ?? "3101"}/health`,
  },
  {
    expectedService: "realtime",
    expectedStatus: "ready",
    url: `http://127.0.0.1:${process.env.STAGING_REALTIME_PORT ?? "3101"}/ready`,
  },
  {
    expectedService: "worker",
    expectedStatus: "ok",
    url: `http://127.0.0.1:${process.env.STAGING_WORKER_PORT ?? "3102"}/health`,
  },
  {
    expectedService: "worker",
    expectedStatus: "ready",
    url: `http://127.0.0.1:${process.env.STAGING_WORKER_PORT ?? "3102"}/ready`,
  },
];

for (const endpoint of endpoints) {
  const response = await fetch(endpoint.url, {
    headers: { "x-correlation-id": correlationId },
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${endpoint.url} returned HTTP ${response.status}.`);
  }
  if (response.headers.get("x-correlation-id") !== correlationId) {
    throw new Error(`${endpoint.url} did not propagate the correlation ID.`);
  }
  if (/postgresql:\/\/|redis:\/\/|password|secret/iu.test(body)) {
    throw new Error(`${endpoint.url} exposed a sensitive readiness detail.`);
  }

  const payload = JSON.parse(body);
  if (payload.service !== endpoint.expectedService || payload.status !== endpoint.expectedStatus) {
    throw new Error(`${endpoint.url} returned an unexpected health contract.`);
  }
}

console.log(`STAGING_SMOKE=PASS (${endpoints.length} correlated endpoints)`);

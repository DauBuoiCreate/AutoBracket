import { expect, test } from "@playwright/test";

test("web health page and API expose a correlated public-safe liveness contract", async ({
  page,
  request,
}) => {
  const pageResponse = await page.goto("/health");
  expect(pageResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Web process đang hoạt động." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở readiness JSON" })).toHaveAttribute(
    "href",
    "/api/ready",
  );

  const correlationId = "e2e-health-20260713";
  const apiResponse = await request.get("/api/health", {
    headers: { "x-correlation-id": correlationId },
  });
  expect(apiResponse.status()).toBe(200);
  expect(apiResponse.headers()["cache-control"]).toBe("no-store");
  expect(apiResponse.headers()["x-correlation-id"]).toBe(correlationId);

  const payload = (await apiResponse.json()) as Record<string, unknown>;
  expect(payload).toMatchObject({ service: "web", status: "ok" });
  expect(payload.timestamp).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/u));
  expect(payload).not.toHaveProperty("version");
});

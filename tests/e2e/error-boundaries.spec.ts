import { expect, test } from "@playwright/test";

const healthHeading = "Web process đang hoạt động.";

test("segment error boundary hides internal details and reset recovers the page", async ({
  page,
}) => {
  const response = await page.goto("/health");

  expect(response?.status()).toBe(200);
  await page.getByRole("button", { name: "Gây lỗi segment có kiểm soát" }).click();
  await expect(
    page.getByRole("heading", { name: "Trang này chưa thể tải hoàn chỉnh." }),
  ).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Vui lòng thử lại." })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("segment-internal-sentinel");

  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("heading", { name: healthHeading })).toBeVisible();
});

test("global error boundary hides internal details and reset recovers the root layout", async ({
  page,
}) => {
  const response = await page.goto("/health");

  expect(response?.status()).toBe(200);
  await page.getByRole("button", { name: "Gây lỗi global có kiểm soát" }).click();
  await expect(
    page.getByRole("heading", { name: "Ứng dụng gặp lỗi ngoài dự kiến." }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Chi tiết nội bộ đã được ẩn." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("body")).not.toContainText("global-internal-sentinel");

  await page.getByRole("button", { name: "Tải lại" }).click();
  await expect(page.getByRole("heading", { name: healthHeading })).toBeVisible();
});

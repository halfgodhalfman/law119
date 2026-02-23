// @ts-nocheck
import { test, expect } from "@playwright/test";

test("attorney visiting client center is redirected to attorney dashboard", async ({ page, request }) => {
  const switchResp = await request.post("/api/dev/auth-switch", {
    data: { actor: "attorney" },
  });
  expect(switchResp.ok()).toBeTruthy();

  // Reuse auth cookie in browser context.
  const cookies = await request.storageState();
  await page.context().addCookies(
    (cookies.cookies || []).filter((c) => c.name === "law119_dev_actor"),
  );

  await page.goto("/marketplace/client-center");
  await expect(page).toHaveURL(/\/attorney\/dashboard$/);
});

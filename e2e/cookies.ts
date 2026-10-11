import type { BrowserContext } from "@playwright/test";

export async function rejectOptionalCookies(context: BrowserContext) {
  await context.addCookies([
    {
      name: "eph-cookie-consent",
      value: "v1.a0.m0",
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

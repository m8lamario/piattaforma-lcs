import { test, expect, type Browser, type Page } from "@playwright/test";
import { fiscalCodeControlChar } from "../src/features/players/domain/fiscalCode";
import { rejectOptionalCookies } from "./cookies";
import { guardianAuthorizeEmailQueued, markEmailVerified, replaceGuardianAuthorizeToken, clearRateLimits, ensureRepPassword, ensureE2eTeam, userExists } from "./db";

async function readLegalDocuments(page: Page) {
  const open = page.getByRole("button", { name: "Leggi l’informativa" });
  await expect(open.first()).toBeVisible();
  while ((await open.count()) > 0) {
    await open.first().click();
    const dialog = page.locator("dialog[open]");
    const scroller = dialog.locator("[data-legal-scroller]");
    await expect(scroller).toBeVisible();
    await scroller.evaluate((el) => {
      el.scrollTo(0, el.scrollHeight);
    });
    const done = dialog.getByRole("button", { name: "Ho letto" });
    await expect(done).toBeEnabled();
    await done.click();
    await expect(dialog).toHaveCount(0);
    const accept = page.locator('input[id^="accept-visible-"]:not([disabled])');
    if ((await accept.count()) > 0) {
      await accept.first().click();
    }
  }
}

async function checkConsentBoxes(page: Page) {
  const boxes = page.locator('input[id^="box-"]');
  const boxCount = await boxes.count();
  for (let index = 0; index < boxCount; index += 1) {
    await boxes.nth(index).check();
  }
}

async function redeemInvite(page: Page, browser: Browser) {
  await clearRateLimits("redeem");
  await clearRateLimits("login");
  await ensureRepPassword();
  await ensureE2eTeam();
  await rejectOptionalCookies(page.context());
  await page.goto("/accedi");
  await page.getByLabel("Email").fill("rep@gmail.com");
  await page.getByLabel("Password").fill("CiaoCiao");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page).toHaveURL(/\/(area|squadra)/);

  await page.goto("/squadra/inviti");
  const redeemUrl = await page.locator("code").first().innerText();
  expect(redeemUrl).toContain("/iscrizione/");

  const playerContext = await browser.newContext();
  await rejectOptionalCookies(playerContext);
  const player = await playerContext.newPage();
  return { player, redeemUrl };
}

function debugJoinLog(message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7693/ingest/5c6b6d7d-171d-41fc-8f12-2fa6a7b3b82d", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3862ef" },
    body: JSON.stringify({
      sessionId: "3862ef",
      runId: "post-fix",
      hypothesisId: "F",
      location: "e2e/happy-path.spec.ts:debugJoinLog",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => undefined);
  // #endregion
}

async function fillJoinAsPlayer(player: Page, email: string, password: string, testId: string) {
  await expect(player.locator("#email")).toBeVisible();
  await player.getByRole("radio", { name: /^Giocatore/ }).check();
  await player.locator("#email").fill(email);
  await player.locator("#password").fill(password);
  await player.locator("#confirmPassword").fill(password);
  const emailValue = await player.locator("#email").inputValue();
  debugJoinLog("join form before submit", {
    testId,
    emailStartsE2e: emailValue.startsWith("e2e."),
    emailLength: emailValue.length,
    categoryChecked: await player.getByRole("radio", { name: /^Giocatore/ }).isChecked(),
  });
  await player.getByRole("button", { name: "Crea account e continua" }).click();
  const outcome = await Promise.race([
    player.waitForURL(/\/verifica-email/, { timeout: 15_000 }).then(() => "navigated" as const),
    player.locator('div[role="alert"] code').waitFor({ state: "visible", timeout: 15_000 }).then(() => "error" as const),
  ]).catch(() => "timeout" as const);
  const url = player.url();
  const alertText = (await player.getByRole("alert").allTextContents()).join(" | ").slice(0, 240);
  const shown = (await player.locator("strong").first().textContent().catch(() => "")) ?? "";
  const stamp = email.split(".")[1]?.split("@")[0] ?? "";
  debugJoinLog("join form after submit", {
    testId,
    outcome,
    pathname: new URL(url).pathname,
    hasVerificaInUrl: url.includes("verifica-email"),
    heading: (await player.locator("h1").first().textContent()) ?? "",
    alertText,
    shownStartsE2e: shown.startsWith("e2e."),
    shownLength: shown.length,
    shownHasAt: shown.includes("@"),
    shownIncludesStamp: stamp.length > 0 && shown.includes(stamp),
    userExists: userExists(email),
  });
}

test("happy path: invito, redeem, wizard minimo, pagamento stub", async ({ page, browser }) => {
  const stamp = String(Date.now());
  const email = `e2e.${stamp}@example.test`;
  const password = "ChangeMe_E2EPlayer1!";
  const body = `RSSMRA80A01H${stamp.slice(-3)}`;
  const fiscalCode = `${body}${fiscalCodeControlChar(body)}`;

  const { player, redeemUrl } = await redeemInvite(page, browser);
  await player.goto(redeemUrl);
  await fillJoinAsPlayer(player, email, password, "adult");
  await expect(player).toHaveURL(/\/verifica-email/);
  await expect(player.getByLabel("Codice di verifica")).toBeVisible();

  await markEmailVerified(email);

  await player.goto("/area/registrazione/dati");
  await player.locator("#firstName").fill("Eva");
  await player.locator("#lastName").fill("Test");
  await player.locator("#birthDate").fill("1980-01-01");
  await player.locator("#fiscalCode").fill(fiscalCode);
  await player.locator("#phone").fill("3331234567");
  await player.locator("#shirtSize").selectOption("M");
  await player.getByRole("button", { name: "Salva e continua" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/certificato/);
  await player.locator("#file").setInputFiles({
    name: "certificato.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  await player.getByRole("button", { name: "Salva e continua" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/privacy/);
  await readLegalDocuments(player);
  await checkConsentBoxes(player);
  await player.getByRole("button", { name: "Salva e continua" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/liberatorie/);
  await readLegalDocuments(player);
  await player.getByRole("button", { name: "Salva le scelte e continua" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/pagamento/);
  await player.getByRole("button", { name: "Paga ora" }).click();
  await expect(player).toHaveURL(/\/area/);
});

test("minore: verifica email, tutore, attesa genitore e link di autorizzazione", async ({ page, browser }) => {
  const stamp = String(Date.now() + 1);
  const email = `e2e.minor.${stamp}@example.test`;
  const password = "ChangeMe_E2EMinor1!";
  const body = `RSSMRA10H15H${stamp.slice(-3)}`;
  const fiscalCode = `${body}${fiscalCodeControlChar(body)}`;

  const { player, redeemUrl } = await redeemInvite(page, browser);
  await player.goto(redeemUrl);
  await fillJoinAsPlayer(player, email, password, "minor");
  await expect(player).toHaveURL(/\/verifica-email/);
  await expect(player.getByRole("heading", { name: "Verifica email" })).toBeVisible();
  await expect(player.getByLabel("Codice di verifica")).toBeVisible();

  await markEmailVerified(email);

  await player.goto("/area/registrazione/dati");
  await player.locator("#firstName").fill("Luca");
  await player.locator("#lastName").fill("Test");
  await player.locator("#birthDate").fill("2010-06-15");
  await player.locator("#fiscalCode").fill(fiscalCode);
  await player.locator("#phone").fill("3331234567");
  await player.locator("#shirtSize").selectOption("M");
  await player.getByRole("button", { name: "Salva e continua" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/tutore/);
  await player.locator("#guardian-first").fill("Anna");
  await player.locator("#guardian-last").fill("Genitore");
  await player.locator("#guardian-email").fill(`anna.${stamp}@example.test`);
  await player.locator("#guardian-phone").fill("3337654321");
  await player.locator("#g3-sole").check();
  await player.getByRole("button", { name: "Salva e continua" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/certificato/);
  await player.goto("/area/registrazione/privacy");
  await expect(player.getByRole("status").filter({ hasText: "In attesa del genitore" })).toBeVisible();
  await expect(player.getByRole("checkbox")).toHaveCount(0);

  expect(await guardianAuthorizeEmailQueued(email)).toBe(true);
  const token = await replaceGuardianAuthorizeToken(email);

  const guardian = await browser.newPage();
  await rejectOptionalCookies(guardian.context());
  await guardian.goto(`/autorizzazione-genitore/${token}`);
  await expect(guardian.getByRole("heading", { name: "Autorizzazione del genitore o tutore" })).toBeVisible();
  await expect(guardian.getByText("Luca Test")).toBeVisible();
});

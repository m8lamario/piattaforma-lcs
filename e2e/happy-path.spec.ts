import { test, expect, type Browser, type Page } from "@playwright/test";
import { fiscalCodeControlChar } from "../src/features/players/domain/fiscalCode";
import { guardianAuthorizeEmailQueued, markEmailVerified, replaceGuardianAuthorizeToken, clearRateLimits } from "./db";

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
  await page.goto("/accedi");
  await page.getByLabel("Email").fill("rep@gmail.com");
  await page.getByLabel("Password").fill("CiaoCiao");
  await page.getByRole("button", { name: "Entra" }).click();
  await expect(page).toHaveURL(/\/(area|squadra)/);

  await page.goto("/squadra/inviti");
  const redeemUrl = await page.locator("code").first().innerText();
  expect(redeemUrl).toContain("/iscrizione/");

  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  return { player, redeemUrl };
}

test("happy path: invito, redeem, wizard minimo, pagamento stub", async ({ page, browser }) => {
  const stamp = String(Date.now());
  const email = `e2e.${stamp}@example.test`;
  const password = "ChangeMe_E2EPlayer1!";
  const body = `RSSMRA80A01H${stamp.slice(-3)}`;
  const fiscalCode = `${body}${fiscalCodeControlChar(body)}`;

  const { player, redeemUrl } = await redeemInvite(page, browser);
  await player.goto(redeemUrl);
  await expect(player.locator("#email")).toBeVisible();
  await player.locator("#email").fill(email);
  await player.locator("#password").fill(password);
  await player.locator("#confirmPassword").fill(password);
  await player.getByRole("button", { name: "Crea account e continua" }).click();
  await expect(player).toHaveURL(/\/verifica-email/);

  await markEmailVerified(email);

  await player.goto("/area/registrazione/dati");
  await player.locator("#firstName").fill("Eva");
  await player.locator("#lastName").fill("Test");
  await player.locator("#birthDate").fill("1980-01-01");
  await player.locator("#fiscalCode").fill(fiscalCode);
  await player.locator("#phone").fill("3331234567");
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
  await expect(player.locator("#email")).toBeVisible();
  await player.locator("#email").fill(email);
  await player.locator("#password").fill(password);
  await player.locator("#confirmPassword").fill(password);
  await player.getByRole("button", { name: "Crea account e continua" }).click();
  await expect(player).toHaveURL(/\/verifica-email/);
  await expect(player.getByRole("heading", { name: "Verifica email" })).toBeVisible();

  await markEmailVerified(email);

  await player.goto("/area/registrazione/dati");
  await player.locator("#firstName").fill("Luca");
  await player.locator("#lastName").fill("Test");
  await player.locator("#birthDate").fill("2010-06-15");
  await player.locator("#fiscalCode").fill(fiscalCode);
  await player.locator("#phone").fill("3331234567");
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
  await guardian.goto(`/autorizzazione-genitore/${token}`);
  await expect(guardian.getByRole("heading", { name: "Autorizzazione del genitore o tutore" })).toBeVisible();
  await expect(guardian.getByText("Luca Test")).toBeVisible();
});

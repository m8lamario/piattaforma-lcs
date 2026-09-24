import { test, expect, type Page } from "@playwright/test";
import { fiscalCodeControlChar } from "../src/features/players/domain/fiscalCode";

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
  }
}

test("happy path: invito, redeem, wizard minimo, pagamento stub", async ({ page, browser }) => {
  const stamp = String(Date.now());
  const email = `e2e.${stamp}@example.test`;
  const password = "ChangeMe_E2EPlayer1!";
  const body = `RSSMRA80A01H${stamp.slice(-3)}`;
  const fiscalCode = `${body}${fiscalCodeControlChar(body)}`;

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
  await player.goto(redeemUrl);
  await expect(player.locator("#email")).toBeVisible();
  await player.locator("#email").fill(email);
  await player.locator("#password").fill(password);
  await player.locator("#confirmPassword").fill(password);
  await player.getByRole("button", { name: "Crea account e continua" }).click();
  await expect(player).toHaveURL(/\/area/);

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
  const boxes = player.locator('input[type="checkbox"]');
  await expect(boxes.first()).toBeEnabled();
  const boxCount = await boxes.count();
  expect(boxCount).toBeGreaterThan(0);
  for (let index = 0; index < boxCount; index += 1) {
    await boxes.nth(index).check();
  }
  await player.getByRole("button", { name: "Salva e continua" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/liberatorie/);
  await readLegalDocuments(player);
  await player.getByRole("button", { name: "Non accetto e continuo" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/pagamento/);
  await player.getByRole("button", { name: "Paga ora" }).click();
  await expect(player).toHaveURL(/\/area/);
});

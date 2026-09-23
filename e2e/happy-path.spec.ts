import { test, expect } from "@playwright/test";
import { fiscalCodeControlChar } from "../src/features/players/domain/fiscalCode";

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
  const boxes = player.locator('input[type="checkbox"]');
  await expect(boxes.first()).toBeVisible();
  const boxCount = await boxes.count();
  expect(boxCount).toBeGreaterThan(0);
  for (let index = 0; index < boxCount; index += 1) {
    await boxes.nth(index).check({ force: true });
  }
  await player.getByRole("button", { name: "Salva e continua" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/liberatorie/);
  await player.getByRole("button", { name: "Non accetto e continuo" }).click();

  await expect(player).toHaveURL(/\/area\/registrazione\/pagamento/);
  await player.getByRole("button", { name: "Paga ora" }).click();
  await expect(player).toHaveURL(/\/area/);
});

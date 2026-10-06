import { describe, expect, it } from "vitest";
import { escapeHtml, paragraphsHtml } from "./html";
import { wrapEmailLayout } from "./layout";
import { EMAIL_LOGO_PATH, EMAIL_THEME } from "./theme";

describe("layout email", () => {
  it("escape HTML e non lascia URL isolati nel corpo se sono CTA", () => {
    expect(escapeHtml(`<a href="x">`)).toBe("&lt;a href=&quot;x&quot;&gt;");
    const html = paragraphsHtml("Ciao\n\nhttps://hub.test/area", ["https://hub.test/area"]);
    expect(html).toContain("Ciao");
    expect(html).not.toContain("https://hub.test/area");
  });

  it("costruisce header, sideline e footer senza pixel di tracking", () => {
    const html = wrapEmailLayout({
      origin: "https://hub.test",
      subject: "Oggetto",
      preheader: "Anteprima",
      heading: "Titolo",
      tone: "neutral",
      bodyHtml: "<p>Corpo</p>",
      cta: { label: "Apri", url: "https://hub.test/area" },
    });
    expect(html).toContain(`${EMAIL_LOGO_PATH}`);
    expect(html).toContain(EMAIL_THEME.headerBg);
    expect(html).toContain(EMAIL_THEME.primary);
    expect(html).toContain("Apri");
    expect(html).toContain("/privacy");
    expect(html).toContain("/liberatorie");
    expect(html).not.toMatch(/width="1"/i);
    expect(html).not.toContain("tracking");
  });
});

import { describe, expect, it } from "vitest";
import { paymentAdapter, storageAdapter } from "./index";

describe("adapter stub", () => {
  it("crea un checkout fittizio senza dati carta", async () => {
    const result = await paymentAdapter.createCheckout({
      amount: 4000,
      currency: "EUR",
      reference: "reg_1",
      successUrl: "https://example.test/ok",
      cancelUrl: "https://example.test/ko",
    });
    expect(result.providerRef).toContain("stub_");
    expect(result.redirectUrl).toBe("https://example.test/ok");
  });

  it("restituisce una signed URL non pubblica di produzione", async () => {
    const stored = await storageAdapter.putPrivate({
      key: "documents/doc_1",
      body: Buffer.from("pdf"),
      mimeType: "application/pdf",
    });
    const signed = await storageAdapter.getSignedReadUrl({
      key: stored.key,
      expiresInSeconds: 60,
    });
    expect(signed.url).toContain("signed");
    const read = await storageAdapter.readPrivate({ key: stored.key });
    expect(read?.body.toString("utf8")).toBe("pdf");
  });
});

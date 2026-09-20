import { describe, expect, it } from "vitest";
import { acceptsFile } from "./fileAccept";

describe("acceptsFile", () => {
  const accept = "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";

  it("accepts pdf and images by mime or extension", () => {
    expect(acceptsFile({ name: "cert.pdf", type: "application/pdf" }, accept)).toBe(true);
    expect(acceptsFile({ name: "foto.JPG", type: "" }, accept)).toBe(true);
    expect(acceptsFile({ name: "scan.png", type: "image/png" }, accept)).toBe(true);
  });

  it("rejects other types", () => {
    expect(acceptsFile({ name: "notes.txt", type: "text/plain" }, accept)).toBe(false);
    expect(
      acceptsFile(
        { name: "doc.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
        accept,
      ),
    ).toBe(false);
  });
});

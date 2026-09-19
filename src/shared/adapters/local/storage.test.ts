import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { localStorageAdapter } from "./storage";

describe("local storage adapter", () => {
  const previousRoot = process.env.STORAGE_LOCAL_ROOT;
  let root = "";

  afterEach(async () => {
    if (previousRoot === undefined) {
      delete process.env.STORAGE_LOCAL_ROOT;
    } else {
      process.env.STORAGE_LOCAL_ROOT = previousRoot;
    }
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("scrive e legge fuori da public/", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "esl-storage-"));
    process.env.STORAGE_LOCAL_ROOT = root;
    const key = "documents/reg_1/abc123";
    await localStorageAdapter.putPrivate({
      key,
      body: Buffer.from("%PDF-1.4"),
      mimeType: "application/pdf",
    });
    const stored = await localStorageAdapter.readPrivate({ key });
    expect(stored?.body.toString("ascii")).toContain("%PDF");
    expect(path.resolve(root, key).startsWith(path.resolve(root))).toBe(true);
  });

  it("rifiuta chiavi che escono dalla root", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "esl-storage-"));
    process.env.STORAGE_LOCAL_ROOT = root;
    await expect(
      localStorageAdapter.putPrivate({
        key: "../escape.bin",
        body: Buffer.from("no"),
        mimeType: "application/pdf",
      }),
    ).rejects.toThrow(/non valida/);
  });
});

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter } from "../types";

function rootDir() {
  return process.env.STORAGE_LOCAL_ROOT ?? path.join(process.cwd(), ".local-storage");
}

function absolutePath(key: string) {
  const root = path.resolve(/* turbopackIgnore: true */ rootDir());
  const absolute = path.resolve(/* turbopackIgnore: true */ root, key);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (absolute !== root && !absolute.startsWith(prefix)) {
    throw new Error("storage key non valida");
  }
  return absolute;
}

export const localStorageAdapter: StorageAdapter = {
  async putPrivate(input) {
    const absolute = absolutePath(input.key);
    await mkdir(/* turbopackIgnore: true */ path.dirname(absolute), { recursive: true });
    await writeFile(/* turbopackIgnore: true */ absolute, input.body);
    return { key: input.key };
  },
  async readPrivate(input) {
    try {
      const body = await readFile(/* turbopackIgnore: true */ absolutePath(input.key));
      return { body };
    } catch {
      return null;
    }
  },
  async getSignedReadUrl(input) {
    return { url: `https://storage.invalid/signed/${input.key}` };
  },
  async delete(input) {
    await unlink(/* turbopackIgnore: true */ absolutePath(input.key)).catch(() => undefined);
  },
};

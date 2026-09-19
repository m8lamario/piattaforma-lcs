import type { StorageAdapter } from "../types";

export const stubStorageAdapter: StorageAdapter = {
  async putPrivate(input) {
    return { key: input.key };
  },
  async readPrivate() {
    return null;
  },
  async getSignedReadUrl(input) {
    return { url: `https://storage.invalid/signed/${input.key}?stub=1` };
  },
  async delete() {
    return;
  },
};

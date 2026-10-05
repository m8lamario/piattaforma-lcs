export type PrivacyDraft = {
  versionIds: Record<string, string>;
  readSlugs: Record<string, boolean>;
  checkedSlugs: Record<string, boolean>;
  boxValues: Record<string, boolean>;
};

const listeners = new Set<() => void>();
let snapshotCache: { token: string; value: PrivacyDraft | null } | null = null;

export function privacyDraftKey(registrationId: string) {
  return `esl-privacy-wizard:${registrationId}`;
}

export function versionsMatch(stored: Record<string, string>, current: Record<string, string>) {
  const slugs = new Set([...Object.keys(stored), ...Object.keys(current)]);
  for (const slug of slugs) {
    if (stored[slug] !== current[slug]) return false;
  }
  return true;
}

export function reconcilePrivacyDraft(
  draft: PrivacyDraft | null,
  versionIds: Record<string, string>,
  currentBoxes: Record<string, boolean>,
): Omit<PrivacyDraft, "versionIds"> {
  if (!draft || !versionsMatch(draft.versionIds, versionIds)) {
    return {
      readSlugs: {},
      checkedSlugs: {},
      boxValues: { ...currentBoxes },
    };
  }
  return {
    readSlugs: { ...draft.readSlugs },
    checkedSlugs: { ...draft.checkedSlugs },
    boxValues: { ...currentBoxes, ...draft.boxValues },
  };
}

export function subscribePrivacyDraft(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function emitPrivacyDraft() {
  for (const listener of listeners) listener();
}

export function readPrivacyDraft(registrationId: string): PrivacyDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const key = privacyDraftKey(registrationId);
    const raw = window.sessionStorage.getItem(key);
    const token = `${key}:${raw ?? ""}`;
    if (snapshotCache?.token === token) return snapshotCache.value;
    if (!raw) {
      snapshotCache = { token, value: null };
      return null;
    }
    const parsed = JSON.parse(raw) as PrivacyDraft;
    const value =
      !parsed || typeof parsed !== "object"
        ? null
        : {
            versionIds: parsed.versionIds ?? {},
            readSlugs: parsed.readSlugs ?? {},
            checkedSlugs: parsed.checkedSlugs ?? {},
            boxValues: parsed.boxValues ?? {},
          };
    snapshotCache = { token, value };
    return value;
  } catch {
    return null;
  }
}

export function writePrivacyDraft(registrationId: string, draft: PrivacyDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(privacyDraftKey(registrationId), JSON.stringify(draft));
    emitPrivacyDraft();
  } catch {
    return;
  }
}

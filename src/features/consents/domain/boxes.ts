export const CONSENT_BOX_CODES = [
  "T1",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7",
  "M8",
  "M9",
  "M10",
  "M11",
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
  "G13",
  "G14",
  "C1",
] as const;

export type ConsentBoxCode = (typeof CONSENT_BOX_CODES)[number];

export type ConsentBoxPath = "adult" | "minor" | "both";
export type ConsentBoxKind = "required" | "play" | "optional" | "opt_out" | "confirmation";
export type ConsentBoxStep = "privacy" | "liberatorie" | "tutore" | "email";
export type G3Value = "OTHER_PARENT" | "SOLE";

export type ConsentBoxDef = {
  code: ConsentBoxCode;
  path: ConsentBoxPath;
  kind: ConsentBoxKind;
  step: ConsentBoxStep;
  partnersOnly?: boolean;
  labelKey: `box${ConsentBoxCode}`;
};

export const CONSENT_BOXES: ConsentBoxDef[] = [
  { code: "T1", path: "both", kind: "required", step: "privacy", labelKey: "boxT1" },
  { code: "M1", path: "adult", kind: "required", step: "privacy", labelKey: "boxM1" },
  { code: "M2", path: "adult", kind: "required", step: "privacy", labelKey: "boxM2" },
  { code: "M3", path: "adult", kind: "play", step: "privacy", labelKey: "boxM3" },
  { code: "M4", path: "adult", kind: "optional", step: "privacy", labelKey: "boxM4" },
  { code: "M5", path: "adult", kind: "optional", step: "privacy", partnersOnly: true, labelKey: "boxM5" },
  { code: "M6", path: "adult", kind: "opt_out", step: "privacy", labelKey: "boxM6" },
  { code: "M7", path: "adult", kind: "optional", step: "liberatorie", labelKey: "boxM7" },
  { code: "M8", path: "adult", kind: "optional", step: "liberatorie", labelKey: "boxM8" },
  { code: "M9", path: "adult", kind: "optional", step: "liberatorie", labelKey: "boxM9" },
  { code: "M10", path: "adult", kind: "optional", step: "liberatorie", labelKey: "boxM10" },
  { code: "M11", path: "adult", kind: "optional", step: "liberatorie", labelKey: "boxM11" },
  { code: "G1", path: "minor", kind: "required", step: "tutore", labelKey: "boxG1" },
  { code: "G2", path: "minor", kind: "required", step: "privacy", labelKey: "boxG2" },
  { code: "G3", path: "minor", kind: "required", step: "tutore", labelKey: "boxG3" },
  { code: "G4", path: "minor", kind: "play", step: "privacy", labelKey: "boxG4" },
  { code: "G5", path: "minor", kind: "optional", step: "privacy", labelKey: "boxG5" },
  { code: "G6", path: "minor", kind: "optional", step: "privacy", labelKey: "boxG6" },
  { code: "G7", path: "minor", kind: "optional", step: "privacy", partnersOnly: true, labelKey: "boxG7" },
  { code: "G8", path: "minor", kind: "opt_out", step: "privacy", labelKey: "boxG8" },
  { code: "G9", path: "minor", kind: "optional", step: "liberatorie", labelKey: "boxG9" },
  { code: "G10", path: "minor", kind: "optional", step: "liberatorie", labelKey: "boxG10" },
  { code: "G11", path: "minor", kind: "optional", step: "liberatorie", labelKey: "boxG11" },
  { code: "G12", path: "minor", kind: "optional", step: "liberatorie", labelKey: "boxG12" },
  { code: "G13", path: "minor", kind: "optional", step: "liberatorie", labelKey: "boxG13" },
  { code: "G14", path: "minor", kind: "optional", step: "liberatorie", labelKey: "boxG14" },
  { code: "C1", path: "minor", kind: "confirmation", step: "email", labelKey: "boxC1" },
];

export const MEDIA_USE_CODES = {
  adult: ["M7", "M8", "M9", "M10", "M11"] as const,
  minor: ["G9", "G10", "G11", "G12", "G13"] as const,
};

export const CHANNEL_CODE = { adult: "M7", minor: "G9" } as const;
export const HEALTH_CODE = { adult: "M3", minor: "G4" } as const;
export const MARKETING_CODE = { adult: "M4", minor: "G6" } as const;
export const PARTNER_CODE = { adult: "M5", minor: "G7" } as const;
export const OPTOUT_CODE = { adult: "M6", minor: "G8" } as const;

export type ChoiceSnapshot = {
  code: string;
  accepted: boolean;
  value?: string | null;
  createdAt: number;
};

export function isConsentBoxCode(value: string): value is ConsentBoxCode {
  return CONSENT_BOXES.some((box) => box.code === value);
}

export function boxesFor(input: {
  isMinor: boolean;
  step?: ConsentBoxStep;
  partnersPublished?: boolean;
}) {
  return CONSENT_BOXES.filter((box) => {
    if (box.path === "adult" && input.isMinor) return false;
    if (box.path === "minor" && !input.isMinor) return false;
    if (input.step && box.step !== input.step) return false;
    if (box.partnersOnly && !input.partnersPublished) return false;
    return true;
  });
}

export function latestChoices(events: ChoiceSnapshot[]): Map<string, ChoiceSnapshot> {
  const map = new Map<string, ChoiceSnapshot>();
  for (const event of events) {
    const current = map.get(event.code);
    if (!current || event.createdAt >= current.createdAt) {
      map.set(event.code, event);
    }
  }
  return map;
}

export function latestAccepted(map: Map<string, ChoiceSnapshot>, code: string) {
  return map.get(code)?.accepted === true;
}

export function g3Value(map: Map<string, ChoiceSnapshot>): G3Value | null {
  const value = map.get("G3")?.value;
  if (value === "OTHER_PARENT" || value === "SOLE") return value;
  return null;
}

export function requiredPrivacyBoxes(isMinor: boolean, partnersPublished: boolean) {
  return boxesFor({ isMinor, step: "privacy", partnersPublished }).filter(
    (box) => box.kind === "required" || box.kind === "play",
  );
}

export function privacyBoxesComplete(
  isMinor: boolean,
  partnersPublished: boolean,
  map: Map<string, ChoiceSnapshot>,
) {
  return requiredPrivacyBoxes(isMinor, partnersPublished).every((box) => latestAccepted(map, box.code));
}

export function mediaBoxesRecorded(isMinor: boolean, map: Map<string, ChoiceSnapshot>) {
  const codes = isMinor ? MEDIA_USE_CODES.minor : MEDIA_USE_CODES.adult;
  return codes.every((code) => map.has(code));
}

export function mediaActivation(input: {
  isMinor: boolean;
  needsAgreement: boolean;
  map: Map<string, ChoiceSnapshot>;
}) {
  if (!input.isMinor) return true;
  const soleOrConfirmed = g3Value(input.map) === "SOLE" || latestAccepted(input.map, "C1");
  const agreement = !input.needsAgreement || latestAccepted(input.map, "G14");
  return soleOrConfirmed && agreement;
}

export function isBoxActive(
  code: ConsentBoxCode,
  input: {
    isMinor: boolean;
    needsAgreement: boolean;
    map: Map<string, ChoiceSnapshot>;
    marketingOptIn?: boolean;
  },
) {
  if (!latestAccepted(input.map, code)) return false;
  if (code === "M4" || code === "G6") return Boolean(input.marketingOptIn);
  const gated = new Set<ConsentBoxCode>(["G5", "G9", "G10", "G11", "G12", "G13"]);
  if (gated.has(code)) {
    return mediaActivation(input);
  }
  return true;
}

export type PublicationStatus = "publishable" | "not_publishable" | "pending_other_parent";

export type PublicationFlags = {
  status: PublicationStatus;
  channels: boolean;
  promotion: boolean;
  sponsor: boolean;
  press: boolean;
  interviews: boolean;
  fullSurname: boolean;
};

export function publicationFlags(input: {
  isMinor: boolean;
  needsAgreement: boolean;
  map: Map<string, ChoiceSnapshot>;
}): PublicationFlags {
  const pending = input.isMinor && g3Value(input.map) === "OTHER_PARENT" && !latestAccepted(input.map, "C1");
  const active = (code: ConsentBoxCode) => isBoxActive(code, input);
  if (!input.isMinor) {
    return {
      status: active("M7") ? "publishable" : "not_publishable",
      channels: active("M7"),
      promotion: active("M8"),
      sponsor: active("M9"),
      press: active("M10"),
      interviews: active("M11"),
      fullSurname: true,
    };
  }
  return {
    status: pending ? "pending_other_parent" : active("G9") ? "publishable" : "not_publishable",
    channels: active("G9"),
    promotion: active("G10"),
    sponsor: active("G11"),
    press: active("G12"),
    interviews: active("G13"),
    fullSurname: active("G5"),
  };
}

export function revocableCodes(isMinor: boolean, partnersPublished: boolean) {
  return boxesFor({ isMinor, partnersPublished }).filter(
    (box) => box.kind === "optional" || box.kind === "opt_out",
  );
}

export function privacyExtraBoxes(isMinor: boolean, partnersPublished: boolean) {
  return boxesFor({ isMinor, step: "privacy", partnersPublished }).filter(
    (box) => box.code !== "T1" && box.code !== "M2" && box.code !== "G2",
  );
}

export function groupedConsentBoxes(boxes: ConsentBoxDef[]) {
  return {
    required: boxes.filter((box) => box.kind === "required" || box.kind === "play"),
    optional: boxes.filter((box) => box.kind === "optional" || box.kind === "confirmation"),
    optOut: boxes.filter((box) => box.kind === "opt_out"),
  };
}

export function mediaFormBoxes(isMinor: boolean, needsAgreement: boolean) {
  return boxesFor({ isMinor, step: "liberatorie" }).filter((box) => box.code !== "G14" || needsAgreement);
}

export function marketingConfirmed(
  map: Map<string, ChoiceSnapshot>,
  tokens: Array<{ usedAt: number | null }>,
) {
  const code = latestAccepted(map, "M4") ? "M4" : latestAccepted(map, "G6") ? "G6" : null;
  if (!code) return false;
  const choice = map.get(code);
  if (!choice) return false;
  return tokens.some((token) => token.usedAt != null && token.usedAt >= choice.createdAt);
}

export function submittedBoxesFrom(
  formData: FormData,
  codes: readonly ConsentBoxCode[],
): Array<{ code: ConsentBoxCode; accepted: boolean }> {
  return codes.map((code) => ({
    code,
    accepted: formData.get(`box:${code}`) === "on",
  }));
}

export function choiceSummaryLines(
  isMinor: boolean,
  partnersPublished: boolean,
  map: Map<string, ChoiceSnapshot>,
  labels: (code: ConsentBoxCode) => string,
) {
  return boxesFor({ isMinor, partnersPublished })
    .filter((box) => box.step !== "email")
    .map((box) => {
      const latest = map.get(box.code);
      const state = latest?.accepted ? "sì" : latest ? "no" : "—";
      const extra = box.code === "G3" && latest?.value ? ` (${latest.value})` : "";
      return `${box.code}${extra}: ${state} — ${labels(box.code)}`;
    });
}

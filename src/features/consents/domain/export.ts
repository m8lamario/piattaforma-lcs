import {
  boxesFor,
  isBoxActive,
  type ChoiceSnapshot,
  type ConsentBoxCode,
  type PublicationFlags,
} from "./boxes";

export type ConsentExportPayload = {
  generatedAt: string;
  player: { firstName: string; lastName: string; email: string };
  registration: { id: string; teamName: string; editionName: string; competitionName: string };
  documents: Array<{ slug: string; versionId: string; accepted: boolean; isCurrent: boolean }>;
  boxes: Array<{
    code: string;
    accepted: boolean;
    value?: string | null;
    createdAt: number;
    active: boolean;
  }>;
  publication: PublicationFlags;
  marketingOptIn: boolean;
};

export function buildConsentExport(input: {
  player: ConsentExportPayload["player"];
  registration: ConsentExportPayload["registration"];
  documents: ConsentExportPayload["documents"];
  isMinor: boolean;
  needsAgreement: boolean;
  partnersPublished: boolean;
  map: Map<string, ChoiceSnapshot>;
  publication: PublicationFlags;
  marketingOptIn: boolean;
}): ConsentExportPayload {
  const boxes = boxesFor({ isMinor: input.isMinor, partnersPublished: input.partnersPublished }).map((box) => {
    const latest = input.map.get(box.code);
    return {
      code: box.code,
      accepted: latest?.accepted ?? false,
      value: latest?.value ?? null,
      createdAt: latest?.createdAt ?? 0,
      active: isBoxActive(box.code as ConsentBoxCode, {
        isMinor: input.isMinor,
        needsAgreement: input.needsAgreement,
        map: input.map,
        marketingOptIn: input.marketingOptIn,
      }),
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    player: input.player,
    registration: input.registration,
    documents: input.documents,
    boxes,
    publication: input.publication,
    marketingOptIn: input.marketingOptIn,
  };
}

export function consentExportText(payload: ConsentExportPayload) {
  const lines = [
    `Esportazione consensi ${payload.generatedAt}`,
    `${payload.player.firstName} ${payload.player.lastName} <${payload.player.email}>`,
    `${payload.registration.competitionName} · ${payload.registration.editionName} · ${payload.registration.teamName}`,
    "",
    "Documenti",
    ...payload.documents.map(
      (row) => `- ${row.slug} ${row.versionId} ${row.accepted ? "accettato" : "rifiutato"} ${row.isCurrent ? "corrente" : "non corrente"}`,
    ),
    "",
    "Caselle",
    ...payload.boxes.map(
      (row) =>
        `- ${row.code}: ${row.accepted ? "spuntata" : "non spuntata"} · ${row.active ? "attiva" : "non attiva"}${row.value ? ` (${row.value})` : ""}`,
    ),
    "",
    `Pubblicabile: ${payload.publication.status}`,
    `Marketing confermato: ${payload.marketingOptIn ? "sì" : "no"}`,
  ];
  return lines.join("\n");
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { buildConsentExport, consentExportText } from "@/features/consents/domain/export";
import { latestChoices } from "@/features/consents/domain/boxes";
import { loadPlayerWorkspace } from "@/features/registrations/data/workspace";
import { prisma } from "@/shared/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/accedi?next=/area/consensi/export");
  }
  const workspace = await loadPlayerWorkspace(session.user.id);
  if (!workspace) {
    redirect("/area");
  }
  const records = await prisma.consentRecord.findMany({
    where: { registrationId: workspace.registration.id },
    include: { legalDocumentVersion: { include: { legalDocument: true } } },
    orderBy: { acceptedAt: "desc" },
  });
  const seen = new Set<string>();
  const documents = [];
  for (const record of records) {
    const slug = record.legalDocumentVersion.legalDocument.slug;
    if (seen.has(slug)) continue;
    seen.add(slug);
    documents.push({
      slug,
      versionId: record.legalDocumentVersionId,
      accepted: record.accepted,
      isCurrent: record.legalDocumentVersion.isCurrent,
    });
  }
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "txt" ? "txt" : "json";
  const payload = buildConsentExport({
    player: {
      firstName: workspace.profile.firstName,
      lastName: workspace.profile.lastName,
      email: workspace.user.email,
    },
    registration: {
      id: workspace.registration.id,
      teamName: workspace.registration.teamName,
      editionName: workspace.registration.editionName,
      competitionName: workspace.registration.competitionName,
    },
    documents,
    isMinor: workspace.evidence.isMinor,
    needsAgreement: workspace.needsMediaAgreement,
    partnersPublished: workspace.partnersPublished,
    map: latestChoices(workspace.choices),
    publication: workspace.publication,
    marketingOptIn: workspace.marketingOptIn,
  });
  if (format === "txt") {
    return new Response(consentExportText(payload), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="consensi-${workspace.registration.id}.txt"`,
      },
    });
  }
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="consensi-${workspace.registration.id}.json"`,
    },
  });
}

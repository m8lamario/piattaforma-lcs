import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDocumentById } from "@/features/documents/data/documents";
import { parseDocumentAccessToken } from "@/features/documents/domain/signedUrl";
import { storageAdapter } from "@/shared/adapters";
import { authorize } from "@/shared/authz/authorize";
import { getActorByUserId } from "@/shared/authz/getActor";
import { writeAuditLog } from "@/shared/lib/audit";

function notFound() {
  return new NextResponse("Documento non disponibile.", { status: 404 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return notFound();

  const parsed = parseDocumentAccessToken(token);
  if (!parsed) {
    return new NextResponse("Link scaduto o non valido.", { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id || session.user.id !== parsed.userId) {
    return notFound();
  }

  const actor = await getActorByUserId(session.user.id);
  const document = await getDocumentById(parsed.documentId);
  if (!actor || !document) return notFound();

  const decision = authorize(actor, "document:read_file", {
    ownerUserId: document.playerProfile.userId,
    teamId: document.registration.teamId,
  });
  if (!decision.allow) return notFound();

  const stored = await storageAdapter.readPrivate({ key: document.storageKey });
  if (!stored) return notFound();

  const forwarded = request.headers.get("x-forwarded-for");
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "DOCUMENT_VIEW",
    entityType: "Document",
    entityId: document.id,
    ipAddress: forwarded?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  const filename = document.originalFilename.replace(/"/g, "");
  return new NextResponse(new Uint8Array(stored.body), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { isAiActionable } from "@/features/documents/domain/aiReview";
import { loadAiFileDocument } from "@/features/documents/data/aiReview";
import { parseMcpFileToken } from "@/features/mcp/fileToken";
import { storageAdapter } from "@/shared/adapters";
import { writeAuditLog } from "@/shared/lib/audit";

function notFound() {
  return new NextResponse("Documento non disponibile.", { status: 404 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return notFound();

  const parsed = parseMcpFileToken(token);
  if (!parsed) return notFound();

  const document = await loadAiFileDocument(parsed.documentId);
  if (
    !document ||
    !isAiActionable({
      typeCode: document.type.code,
      status: document.status,
      aiReviewState: document.aiReviewState,
      blobPurgedAt: document.blobPurgedAt,
    })
  ) {
    return notFound();
  }

  const stored = await storageAdapter.readPrivate({ key: document.storageKey });
  if (!stored) return notFound();

  const forwarded = request.headers.get("x-forwarded-for");
  await writeAuditLog({
    actorKind: "SYSTEM",
    actorRole: "MCP_REVIEW",
    action: "DOCUMENT_AI_VIEW",
    entityType: "Document",
    entityId: document.id,
    metadata: { via: "file" },
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
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}

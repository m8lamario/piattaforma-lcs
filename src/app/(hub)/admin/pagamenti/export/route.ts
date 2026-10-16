import { NextResponse } from "next/server";
import { buildPaymentRegisterCsv } from "@/features/payments/data/register";
import { requireStaff } from "@/shared/authz/requireStaff";
import { writeAuditLog } from "@/shared/lib/audit";

export async function GET() {
  const { session } = await requireStaff("/admin/pagamenti/export");
  const register = await buildPaymentRegisterCsv();
  await writeAuditLog({
    actorUserId: session.user.id,
    action: "PAYMENT_EXPORT",
    entityType: "Payment",
    entityId: "register",
    metadata: { count: register.count },
  });
  return new NextResponse(register.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"pagamenti.csv\"",
      "Cache-Control": "no-store",
    },
  });
}

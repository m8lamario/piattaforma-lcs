import { isMedicalExpired } from "@/features/documents/domain/retention";
import type { MedicalEvidence } from "@/features/registrations/domain/requirements";
import { isOpenDocumentStatus, type MedicalCertificateKind } from "./medicalRequirement";
import type { InspectionAnomaly } from "./certificatePolicy";
import { realignInspectionAnomalies } from "./certificatePolicy";

export function medicalEvidenceFromStatus(
  status: string | undefined,
  expiresAt?: Date | null,
): MedicalEvidence {
  if (status === "APPROVED" && isMedicalExpired(expiresAt ?? null)) return "expired";
  switch (status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
      return "expired";
    case "UPLOADED":
    case "PROCESSING":
    case "PENDING_REVIEW":
    case "PREVALIDATED":
      return "pending";
    default:
      return "none";
  }
}

export function realignOpenDocument(input: {
  status: string;
  requiredKindNow: MedicalCertificateKind;
  recognizedKind: MedicalCertificateKind | null;
  anomalies: readonly InspectionAnomaly[];
}) {
  if (!isOpenDocumentStatus(input.status)) {
    return {
      status: input.status,
      anomalies: [...input.anomalies],
      inspectedKind: input.requiredKindNow,
    };
  }

  const anomalies = realignInspectionAnomalies({
    requiredKindNow: input.requiredKindNow,
    recognizedKind: input.recognizedKind,
    anomalies: input.anomalies,
  });

  const status = input.status === "PREVALIDATED" && anomalies.length > 0 ? "PENDING_REVIEW" : input.status;

  return { status, anomalies, inspectedKind: input.requiredKindNow };
}

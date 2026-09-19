export type RosterRow = {
  registrationId: string;
  firstName: string;
  lastName: string;
  registrationStatus: string;
  medicalStatus: "none" | "pending" | "approved" | "rejected" | "expired";
};

export function toRosterRow(input: {
  registrationId: string;
  firstName: string;
  lastName: string;
  registrationStatus: string;
  medicalStatus?: string | null;
}): RosterRow {
  const medical =
    input.medicalStatus === "APPROVED"
      ? "approved"
      : input.medicalStatus === "REJECTED" || input.medicalStatus === "CHANGES_REQUESTED"
        ? "rejected"
        : input.medicalStatus === "EXPIRED"
          ? "expired"
          : input.medicalStatus === "PENDING_REVIEW" || input.medicalStatus === "UPLOADED"
            ? "pending"
            : "none";
  return {
    registrationId: input.registrationId,
    firstName: input.firstName,
    lastName: input.lastName,
    registrationStatus: input.registrationStatus,
    medicalStatus: medical,
  };
}

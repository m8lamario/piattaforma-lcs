const STEP_LABEL: Record<string, string> = {
  PERSONAL_DATA: "dati",
  GUARDIAN_IF_MINOR: "contatto genitore o tutore",
  MEDICAL_CERT: "certificato",
  PRIVACY: "privacy",
  MEDIA_RELEASE: "liberatorie",
  PAYMENT: "pagamento",
};

export function registrationReminder(pendingCodes: string[]) {
  const labels = pendingCodes.map((code) => STEP_LABEL[code] ?? code);
  return {
    type: "REGISTRATION_REMINDER",
    title: "Promemoria iscrizione",
    body:
      labels.length > 0
        ? `Passi ancora da completare: ${labels.join(", ")}.`
        : "Completa i passi dell’iscrizione dalla tua area.",
  };
}

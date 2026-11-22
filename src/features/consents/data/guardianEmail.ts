import { isOpenAuthorizationStatus } from "@/features/consents/domain/guardianAuth";
import {
  projectGuardianEmailNotices,
  type GuardianEmailNotice,
} from "@/features/consents/domain/guardianEmail";
import {
  latestEnrollmentAuthorization,
  latestPublicationAuthorization,
} from "@/features/consents/data/guardianAuth";
import {
  deliveryViewFor,
  loadUserEmailDeliveries,
  USER_EMAIL_OPS,
  type UserEmailDeliveryView,
} from "@/features/emails/data/userDelivery";
import type { UserEmailDeliveryState } from "@/features/emails/domain/delivery";

export type GuardianEmailPanelView = {
  email: string;
  delivery: UserEmailDeliveryView;
};

export type GuardianEmailPageView = {
  notices: GuardianEmailNotice[];
  primaryPanel: GuardianEmailPanelView | null;
  secondaryPanel: GuardianEmailPanelView | null;
};

function stateOf(view: UserEmailDeliveryView | null): UserEmailDeliveryState | null {
  return view?.state ?? null;
}

export async function loadGuardianEmailPageView(input: {
  registrationId: string;
  primaryEmail: string | null | undefined;
  secondaryEmail: string | null | undefined;
  enrollmentOpen: boolean;
  publicationOpen: boolean;
}): Promise<GuardianEmailPageView> {
  const [enrollment, publication] = await Promise.all([
    latestEnrollmentAuthorization(input.registrationId),
    latestPublicationAuthorization(input.registrationId),
  ]);
  const primaryEmail = input.primaryEmail?.trim() ?? "";
  const secondaryEmail = input.secondaryEmail?.trim() ?? "";
  const primaryOp =
    enrollment && primaryEmail && isOpenAuthorizationStatus(enrollment.status)
      ? USER_EMAIL_OPS.guardianAuthorize(enrollment.id, primaryEmail)
      : null;
  const secondaryOp =
    publication && secondaryEmail && isOpenAuthorizationStatus(publication.status)
      ? USER_EMAIL_OPS.guardianPublication(publication.id, secondaryEmail)
      : null;
  const views = await loadUserEmailDeliveries(
    [primaryOp, secondaryOp].filter((op): op is NonNullable<typeof op> => op !== null),
  );
  const primaryDelivery = primaryOp ? deliveryViewFor(views, primaryOp) : null;
  const secondaryDelivery = secondaryOp ? deliveryViewFor(views, secondaryOp) : null;

  return {
    notices: projectGuardianEmailNotices({
      primary: primaryEmail
        ? { email: primaryEmail, open: input.enrollmentOpen, delivery: stateOf(primaryDelivery) }
        : null,
      secondary: secondaryEmail
        ? { email: secondaryEmail, open: input.publicationOpen, delivery: stateOf(secondaryDelivery) }
        : null,
    }),
    primaryPanel:
      primaryEmail && primaryDelivery ? { email: primaryEmail, delivery: primaryDelivery } : null,
    secondaryPanel:
      secondaryEmail && secondaryDelivery ? { email: secondaryEmail, delivery: secondaryDelivery } : null,
  };
}

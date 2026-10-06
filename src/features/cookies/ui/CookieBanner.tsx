import { cookies, headers } from "next/headers";
import { saveCookieConsentAction } from "@/features/cookies/actions";
import { decodeConsent, safeReturnPath, shouldShowCookieBanner } from "@/shared/cookies/consent";
import { CONSENT_COOKIE_NAME, optionalTechnologies } from "@/shared/cookies/inventory";
import { it } from "@/shared/i18n/it";
import { Button, ButtonLink } from "@/shared/ui/Button";
import styles from "./cookies.module.css";

export async function CookieBanner() {
  const optional = optionalTechnologies();
  const stored = decodeConsent((await cookies()).get(CONSENT_COOKIE_NAME)?.value);
  if (!shouldShowCookieBanner(optional.length, stored)) return null;

  const headerList = await headers();
  const returnTo = safeReturnPath(headerList.get("x-pathname"));

  return (
    <section className={styles.banner} aria-labelledby="cookie-banner-title">
      <h2 id="cookie-banner-title">{it.cookieBannerTitle}</h2>
      <p>{it.cookieBannerText}</p>
      <div className={styles.actions}>
        <form action={saveCookieConsentAction} className={styles.actions}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" name="intent" value="accept" variant="secondary">
            {it.cookieAccept}
          </Button>
          <Button type="submit" name="intent" value="reject" variant="secondary">
            {it.cookieReject}
          </Button>
        </form>
        <ButtonLink href="/cookie" variant="ghost">
          {it.cookiePreferences}
        </ButtonLink>
      </div>
    </section>
  );
}

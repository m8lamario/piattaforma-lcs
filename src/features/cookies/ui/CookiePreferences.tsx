import { cookies } from "next/headers";
import { saveCookieConsentAction, revokeCookieConsentAction } from "@/features/cookies/actions";
import { decodeConsent } from "@/shared/cookies/consent";
import {
  BROWSER_COOKIE_HELP,
  CONSENT_COOKIE_NAME,
  FIRST_PARTY_COOKIES,
  optionalTechnologies,
} from "@/shared/cookies/inventory";
import { it } from "@/shared/i18n/it";
import { Button } from "@/shared/ui/Button";
import styles from "./cookies.module.css";

export async function CookiePreferences() {
  const optional = optionalTechnologies();
  const stored = decodeConsent((await cookies()).get(CONSENT_COOKIE_NAME)?.value);

  return (
    <section className={styles.panel} aria-labelledby="cookie-controls-title">
      <h2 id="cookie-controls-title">{it.cookiePanelTitle}</h2>
      <p>{optional.length === 0 ? it.cookieNoOptional : it.cookieOptionalIntro}</p>
      <table className={styles.table}>
        <caption>{it.cookieTableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{it.cookieColName}</th>
            <th scope="col">{it.cookieColPurpose}</th>
            <th scope="col">{it.cookieColDuration}</th>
          </tr>
        </thead>
        <tbody>
          {FIRST_PARTY_COOKIES.map((item) => (
            <tr key={item.id}>
              <th scope="row">{item.productionName}</th>
              <td>{item.purpose}</td>
              <td>{item.durationLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{it.cookieTechnicalNote}</p>
      <p>{it.cookieLogoutNote}</p>
      {optional.length > 0 ? (
        <>
          <form action={saveCookieConsentAction} className={styles.choice}>
            <input type="hidden" name="returnTo" value="/cookie" />
            {optional.some((item) => item.category === "analytics") ? (
              <label>
                <input type="checkbox" name="analytics" defaultChecked={stored?.analytics === true} />
                <span>{it.cookieAnalytics}</span>
              </label>
            ) : null}
            {optional.some((item) => item.category === "marketing") ? (
              <label>
                <input type="checkbox" name="marketing" defaultChecked={stored?.marketing === true} />
                <span>{it.cookieMarketing}</span>
              </label>
            ) : null}
            <div className={styles.actions}>
              <Button type="submit" name="intent" value="accept" variant="secondary">
                {it.cookieAccept}
              </Button>
              <Button type="submit" name="intent" value="reject" variant="secondary">
                {it.cookieReject}
              </Button>
              <Button type="submit" name="intent" value="custom" variant="secondary">
                {it.cookieSave}
              </Button>
            </div>
          </form>
          <form action={revokeCookieConsentAction}>
            <input type="hidden" name="returnTo" value="/cookie" />
            <Button type="submit" variant="ghost">
              {it.cookieRevoke}
            </Button>
          </form>
        </>
      ) : null}
      <div>
        <p>{it.cookieBrowserNote}</p>
        <ul className={styles.links}>
          {BROWSER_COOKIE_HELP.map((item) => (
            <li key={item.id}>
              <a href={item.href} rel="noreferrer">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

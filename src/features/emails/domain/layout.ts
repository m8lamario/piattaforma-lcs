import { it } from "@/shared/i18n/it";
import {
  buttonHtml,
  emailAssetUrl,
  escapeHtml,
  fallbackLinkHtml,
} from "./html";
import {
  EMAIL_LOGO_PATH,
  EMAIL_THEME,
  EMAIL_WIDTH,
  emailToneColor,
  type EmailTone,
} from "./theme";

export type EmailLayoutInput = {
  origin: string;
  subject: string;
  preheader: string;
  heading: string;
  tone: EmailTone;
  bodyHtml: string;
  cta?: { label: string; url: string };
};

function legalLinks(origin: string) {
  const items = [
    { href: `${origin}/privacy`, label: it.privacy },
    { href: `${origin}/liberatorie`, label: it.stepLiberatorie },
    { href: `${origin}/termini`, label: it.terms },
    { href: `${origin}/cookie`, label: it.cookies },
  ];
  return items
    .map(
      (item, index) =>
        `${index > 0 ? `<span style="color:${EMAIL_THEME.footerFg};padding:0 8px;">·</span>` : ""}<a href="${escapeHtml(item.href)}" style="color:${EMAIL_THEME.footerLink};text-decoration:none;">${escapeHtml(item.label)}</a>`,
    )
    .join("");
}

export function wrapEmailLayout(input: EmailLayoutInput) {
  const origin = input.origin.replace(/\/$/, "");
  const logoSrc = emailAssetUrl(origin, EMAIL_LOGO_PATH);
  const rail = emailToneColor(input.tone);
  const preheader = escapeHtml(input.preheader);
  const heading = escapeHtml(input.heading);
  const cta =
    input.cta?.url && input.cta.label
      ? `${buttonHtml(input.cta.label, input.cta.url)}${fallbackLinkHtml(it.emailCtaFallback, input.cta.url)}`
      : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(input.subject)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background: ${EMAIL_THEME.canvas}; }
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .email-pad { padding: 24px 18px !important; }
      .email-header { padding: 20px 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${EMAIL_THEME.canvas};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_THEME.canvas};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="email-shell" width="${EMAIL_WIDTH}" cellpadding="0" cellspacing="0" style="width:${EMAIL_WIDTH}px;max-width:100%;background:${EMAIL_THEME.card};border-radius:10px;overflow:hidden;border:1px solid ${EMAIL_THEME.border};">
          <tr>
            <td bgcolor="${EMAIL_THEME.headerBg}" class="email-header" style="padding:22px 28px 18px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${escapeHtml(logoSrc)}" width="30" height="40" alt="${escapeHtml(it.brandShort)}" style="display:block;width:30px;height:40px;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-family:${EMAIL_THEME.font};font-size:20px;letter-spacing:0.16em;color:${EMAIL_THEME.headerFg};font-weight:700;line-height:1;">${escapeHtml(it.brandShort)}</div>
                    <div style="margin-top:4px;font-family:${EMAIL_THEME.font};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_THEME.headerMuted};line-height:1.2;">${escapeHtml(it.brandProduct)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="${EMAIL_THEME.gradientNavy}" height="4" width="33%" style="font-size:0;line-height:4px;">&nbsp;</td>
                  <td bgcolor="${EMAIL_THEME.gradientBlue}" height="4" width="34%" style="font-size:0;line-height:4px;">&nbsp;</td>
                  <td bgcolor="${EMAIL_THEME.gradientTeal}" height="4" width="33%" style="font-size:0;line-height:4px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:32px 28px 12px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-left:3px solid ${rail};padding:2px 0 2px 14px;">
                    <h1 style="margin:0;font-family:${EMAIL_THEME.font};font-size:22px;line-height:1.25;color:${EMAIL_THEME.text};font-weight:700;">${heading}</h1>
                  </td>
                </tr>
              </table>
              <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
              ${input.bodyHtml}
              ${cta}
            </td>
          </tr>
          <tr>
            <td bgcolor="${EMAIL_THEME.footerBg}" class="email-pad" style="padding:22px 28px;">
              <p style="margin:0 0 8px 0;font-family:${EMAIL_THEME.font};font-size:13px;line-height:1.45;color:${EMAIL_THEME.headerFg};">${escapeHtml(it.emailFooterProduct)}</p>
              <p style="margin:0 0 14px 0;font-family:${EMAIL_THEME.font};font-size:13px;line-height:1.45;color:${EMAIL_THEME.footerFg};">${escapeHtml(it.orgLine)}</p>
              <p style="margin:0 0 14px 0;font-family:${EMAIL_THEME.font};font-size:13px;line-height:1.45;">${legalLinks(origin)}</p>
              <p style="margin:0;font-family:${EMAIL_THEME.font};font-size:12px;line-height:1.45;color:${EMAIL_THEME.footerFg};">${escapeHtml(it.emailFooterService)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

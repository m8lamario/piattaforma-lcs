import { EMAIL_THEME } from "./theme";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailAssetUrl(origin: string, path: string) {
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function linkifyEscaped(escapedText: string) {
  return escapedText.replace(/https?:\/\/[^\s<]+/gi, (url) => {
    return `<a href="${url}" style="color:${EMAIL_THEME.link};text-decoration:underline;word-break:break-all;">${url}</a>`;
  });
}

export function paragraphsHtml(text: string, skipUrls: string[] = []) {
  const skip = new Set(skipUrls.filter(Boolean).map((url) => url.trim()));
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !skip.has(block))
    .map((block) => {
      const escaped = escapeHtml(block).replace(/\n/g, "<br />");
      return `<p style="margin:0 0 16px 0;font-family:${EMAIL_THEME.font};font-size:16px;line-height:1.55;color:${EMAIL_THEME.text};">${linkifyEscaped(escaped)}</p>`;
    })
    .join("");
}

export function detailsHtml(rows: { label: string; value: string }[]) {
  const visible = rows.filter((row) => row.value.trim().length > 0);
  if (visible.length === 0) return "";
  const items = visible
    .map((row) => {
      const valueEscaped = escapeHtml(row.value).replace(/\n/g, "<br />");
      return `<tr>
        <td style="padding:8px 0;font-family:${EMAIL_THEME.font};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_THEME.textMuted};width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
        <td style="padding:8px 0;font-family:${EMAIL_THEME.font};font-size:16px;line-height:1.45;color:${EMAIL_THEME.text};vertical-align:top;">${linkifyEscaped(valueEscaped)}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;border-top:1px solid ${EMAIL_THEME.hairline};border-bottom:1px solid ${EMAIL_THEME.hairline};">${items}</table>`;
}

export function infoBoxHtml(title: string | undefined, body: string) {
  if (!body.trim()) return "";
  const heading = title
    ? `<p style="margin:0 0 10px 0;font-family:${EMAIL_THEME.font};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_THEME.textMuted};">${escapeHtml(title)}</p>`
    : "";
  const content = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const escaped = escapeHtml(block).replace(/\n/g, "<br />");
      return `<p style="margin:0 0 12px 0;font-family:${EMAIL_THEME.font};font-size:14px;line-height:1.5;color:${EMAIL_THEME.text};">${linkifyEscaped(escaped)}</p>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
    <tr>
      <td style="background:${EMAIL_THEME.infoBox};border-left:3px solid ${EMAIL_THEME.accent};padding:16px 18px;">
        ${heading}${content}
      </td>
    </tr>
  </table>`;
}

export function verificationCodeHtml(code: string, label: string) {
  if (!/^\d{6}$/.test(code)) return "";
  const digits = escapeHtml(code);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px 0;">
    <tr>
      <td align="center" style="background:${EMAIL_THEME.infoBox};border:1px solid ${EMAIL_THEME.border};border-radius:${EMAIL_THEME.radius};padding:18px 12px 16px 12px;">
        <p style="margin:0 0 10px 0;font-family:${EMAIL_THEME.font};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_THEME.textMuted};">${escapeHtml(label)}</p>
        <p style="margin:0;font-family:Consolas, 'Courier New', monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;line-height:1.2;color:${EMAIL_THEME.headerBg};-webkit-user-select:all;user-select:all;">${digits}</p>
      </td>
    </tr>
  </table>`;
}

export function buttonHtml(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;">
    <tr>
      <td bgcolor="${EMAIL_THEME.primary}" style="border-radius:${EMAIL_THEME.radius};">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;font-family:${EMAIL_THEME.font};font-size:16px;font-weight:700;line-height:1.2;color:${EMAIL_THEME.onPrimary};text-decoration:none;border-radius:${EMAIL_THEME.radius};">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function fallbackLinkHtml(caption: string, url: string) {
  return `<p style="margin:0 0 8px 0;font-family:${EMAIL_THEME.font};font-size:13px;line-height:1.5;color:${EMAIL_THEME.textMuted};">${escapeHtml(caption)}</p>
  <p style="margin:0 0 24px 0;font-family:${EMAIL_THEME.font};font-size:13px;line-height:1.5;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:${EMAIL_THEME.link};text-decoration:underline;">${escapeHtml(url)}</a></p>`;
}

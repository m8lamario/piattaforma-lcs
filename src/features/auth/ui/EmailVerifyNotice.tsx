import Link from "next/link";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";

export function EmailVerifyNotice() {
  return (
    <p className={`${fields.banner} ${fields.bannerInfo}`} role="status">
      {it.emailVerifyNotice} <Link href="/verifica-email">{it.emailVerifyOpen}</Link>
    </p>
  );
}

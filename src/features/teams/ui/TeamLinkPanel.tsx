"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./InviteForm.module.css";

export function TeamLinkPanel({ url, teamName }: { url: string; teamName: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={styles.card}>
      <h2>{it.teamLinkTitle}</h2>
      <p>{it.teamLinkHelp.replace("{team}", teamName)}</p>
      <div className={styles.success}>
        <p>{copied ? it.teamLinkCopied : it.copyLink}</p>
        <code className={styles.url}>{url}</code>
        <Button type="button" onClick={copyLink}>
          {copied ? it.copiedShort : it.copyLink}
        </Button>
      </div>
    </section>
  );
}

"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./InviteForm.module.css";

type Props = {
  url: string;
  teamName: string;
  title?: string;
  help?: string;
  children?: ReactNode;
};

function subscribe() {
  return () => undefined;
}

function canShareSnapshot() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function TeamLinkPanel({ url, teamName, title, help, children }: Props) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(subscribe, canShareSnapshot, () => false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    try {
      await navigator.share({
        title: it.appName,
        text: it.teamLinkHelp.replace("{team}", teamName),
        url,
      });
    } catch {
      /* dismissed */
    }
  }

  return (
    <section className={styles.card}>
      <h2>{title ?? it.teamLinkTitle}</h2>
      <p>{help ?? it.teamLinkHelp.replace("{team}", teamName)}</p>
      <div className={styles.success}>
        <p>{copied ? it.teamLinkCopied : it.copyJoinLink}</p>
        <code className={styles.url}>{url}</code>
        <div className={styles.linkActions}>
          <Button type="button" onClick={copyLink}>
            {copied ? it.copiedShort : it.copyJoinLink}
          </Button>
          {canShare ? (
            <Button type="button" variant="secondary" onClick={shareLink}>
              {it.shareJoinLink}
            </Button>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

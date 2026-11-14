"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/Icon";
import { it } from "@/shared/i18n/it";
import styles from "./TeamLinkPanel.module.css";

type Props = {
  url: string;
  teamName: string;
  children?: ReactNode;
};

function subscribe() {
  return () => undefined;
}

function canShareSnapshot() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function TeamLinkPanel({ url, teamName, children }: Props) {
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
    <div className={styles.root}>
      <div className={styles.field}>
        <Icon name="link" size={18} className={styles.glyph} />
        <code className={styles.url}>{url}</code>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant={copied ? "success" : "primary"} icon={copied ? "check" : "copy"} onClick={copyLink}>
          {copied ? it.copiedShort : it.copyJoinLink}
        </Button>
        {canShare ? (
          <Button type="button" variant="secondary" icon="share" onClick={shareLink}>
            {it.shareJoinLink}
          </Button>
        ) : null}
      </div>
      <p className={styles.feedback} role="status" aria-live="polite">
        {copied ? it.teamLinkCopied : ""}
      </p>
      {children}
    </div>
  );
}

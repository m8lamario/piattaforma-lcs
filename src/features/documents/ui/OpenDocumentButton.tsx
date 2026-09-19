"use client";

import { useState } from "react";
import { createSignedDocumentUrlAction } from "@/features/documents/actions";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./OpenDocumentButton.module.css";

type Props = {
  documentId: string;
};

export function OpenDocumentButton({ documentId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function openFile() {
    setPending(true);
    setError(null);
    const result = await createSignedDocumentUrlAction(documentId);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("url" in result && result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className={styles.wrap}>
      <Button type="button" variant="ghost" disabled={pending} aria-busy={pending} onClick={() => void openFile()}>
        {pending ? it.openingFile : it.openDocument}
      </Button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

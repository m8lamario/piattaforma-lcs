"use client";

import { useEffect, useState } from "react";
import { createSignedDocumentUrlAction } from "@/features/documents/actions";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { Button } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./CertificateViewer.module.css";

type Props = {
  documentId: string;
  mimeType: string;
  available: boolean;
  prefetchedUrl?: string | null;
  loading?: boolean;
};

export function CertificateViewer({ documentId, mimeType, available, prefetchedUrl, loading }: Props) {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const image = mimeType === "image/jpeg" || mimeType === "image/png";
  const pdf = mimeType === "application/pdf";
  const displayUrl = prefetchedUrl ?? fallbackUrl;
  const needsFallback = available && !displayUrl && !loading;

  useEffect(() => {
    if (!needsFallback) return;
    let active = true;
    void createSignedDocumentUrlAction(documentId).then((result) => {
      if (!active) return;
      if ("url" in result && result.url) {
        setFallbackUrl(result.url);
        setFetchError(false);
        return;
      }
      setFetchError(true);
    });
    return () => {
      active = false;
    };
  }, [needsFallback, attempt, documentId]);

  if (!available) {
    return (
      <p className={styles.message} role="status">
        {it.adminReviewFileMissing}
      </p>
    );
  }

  if (!displayUrl) {
    if (fetchError) {
      return (
        <div className={styles.message} role="alert">
          <p>{it.adminReviewFileError}</p>
          <Button type="button" variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            {it.adminReviewFileRetry}
          </Button>
          <OpenDocumentButton documentId={documentId} />
        </div>
      );
    }
    return (
      <p className={styles.message} role="status">
        {it.adminReviewLoading}
      </p>
    );
  }

  if (image) {
    return (
      <div className={styles.frame}>
        <div className={styles.toolbar}>
          <Button type="button" variant="secondary" onClick={() => setZoomed((value) => !value)}>
            {zoomed ? it.adminReviewFit : it.adminReviewZoom}
          </Button>
        </div>
        <div className={styles.stage}>
          {/* eslint-disable-next-line @next/next/no-img-element -- il file medico è privato e il link firmato scade: non passa dall'ottimizzatore immagini */}
          <img
            src={displayUrl}
            alt={it.adminDocumentTitle}
            className={zoomed ? styles.imageZoom : styles.image}
          />
        </div>
      </div>
    );
  }

  if (pdf) {
    return (
      <iframe className={styles.pdf} src={displayUrl} title={it.adminDocumentTitle} />
    );
  }

  return (
    <div className={styles.message}>
      <p>{it.adminReviewFileError}</p>
      <OpenDocumentButton documentId={documentId} />
    </div>
  );
}

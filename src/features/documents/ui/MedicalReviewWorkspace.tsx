"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { SerializedAdminDocumentView, SerializedReviewQueueItem } from "@/features/documents/domain/adminView";
import { parseReviewQueueItem } from "@/features/documents/domain/adminView";
import {
  loadReviewDocumentsAction,
  refreshReviewQueueAction,
  type ReviewDocumentQueueSuccess,
} from "@/features/documents/actions";
import {
  reviewDocumentHref,
  reviewDoneHref,
  reviewQueuePosition,
  reviewQueueQuery,
} from "@/features/documents/domain/reviewQueue";
import { reviewPreloadIds } from "@/features/documents/domain/reviewPreload";
import { elapsedMs, recordReviewTiming } from "@/features/documents/domain/reviewTiming";
import { CertificateViewer } from "@/features/documents/ui/CertificateViewer";
import { OpenDocumentButton } from "@/features/documents/ui/OpenDocumentButton";
import { ReviewForm } from "@/features/documents/ui/ReviewForm";
import { useReviewFileCache } from "@/features/documents/ui/useReviewFileCache";
import { Icon } from "@/shared/ui/Icon";
import { Button } from "@/shared/ui/Button";
import { StatusChip, type StatusTone } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import styles from "@/app/(hub)/admin/documenti/[id]/page.module.css";

type Props = {
  initialDocument: SerializedAdminDocumentView;
  initialQueue: SerializedReviewQueueItem[];
  filters: { teamId?: string; q?: string };
  canReview: boolean;
  canOpen: boolean;
};

function statusLabel(status: string) {
  if (status === "APPROVED") return it.statusDocumentAPPROVED;
  if (status === "REJECTED") return it.statusDocumentREJECTED;
  if (status === "EXPIRED") return it.statusDocumentEXPIRED;
  return it.statusDocumentPENDING_REVIEW;
}

function statusTone(status: string): StatusTone {
  if (status === "APPROVED") return "complete";
  if (status === "REJECTED") return "danger";
  return "attention";
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/jpeg") return "JPEG";
  if (mimeType === "image/png") return "PNG";
  return mimeType;
}

function romeDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function birthLabel(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", dateStyle: "short" }).format(new Date(iso));
}

export function MedicalReviewWorkspace({
  initialDocument,
  initialQueue,
  filters,
  canReview,
  canOpen,
}: Props) {
  const [currentId, setCurrentId] = useState(initialDocument.id);
  const [queue, setQueue] = useState(initialQueue);
  const [views, setViews] = useState<Record<string, SerializedAdminDocumentView>>({
    [initialDocument.id]: initialDocument,
  });
  const [done, setDone] = useState(false);
  const [, startTransition] = useTransition();
  const { ensurePreloaded, get } = useReviewFileCache();
  const reviewStartedAt = useRef<number | null>(null);

  const parsedQueue = useMemo(() => queue.map(parseReviewQueueItem), [queue]);
  const document = views[currentId];
  const position = reviewQueuePosition(parsedQueue, currentId);
  const pending = document?.status === "PENDING_REVIEW";
  const fileAvailable = canOpen && document && !document.blobPurgedAt;

  const syncUrl = useCallback(
    (documentId: string) => {
      const href = reviewDocumentHref(documentId, filters);
      window.history.replaceState(null, "", href);
    },
    [filters],
  );

  const ensureMetadata = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !views[id]);
    if (missing.length === 0) return views;
    const loaded = await loadReviewDocumentsAction(missing);
    if (!("documents" in loaded)) return views;
    const next = { ...views };
    for (const row of loaded.documents) next[row.id] = row;
    setViews(next);
    return next;
  }, [views]);

  const runPreload = useCallback(
    async (documentId: string, queueItems: SerializedReviewQueueItem[], viewSnapshot: Record<string, SerializedAdminDocumentView>) => {
      const parsed = queueItems.map(parseReviewQueueItem);
      const ids = reviewPreloadIds(parsed, documentId);
      const merged = await ensureMetadata(ids);
      const availabilitySource = { ...viewSnapshot, ...merged };
      await ensurePreloaded(parsed, documentId, (id) => {
        const view = availabilitySource[id];
        return Boolean(canOpen && view && !view.blobPurgedAt);
      });
    },
    [canOpen, ensureMetadata, ensurePreloaded],
  );

  const viewsRef = useRef(views);

  useEffect(() => {
    viewsRef.current = views;
    const timer = window.setTimeout(() => {
      void runPreload(currentId, queue, viewsRef.current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentId, queue, views, runPreload]);

  useEffect(() => {
    syncUrl(currentId);
  }, [currentId, syncUrl]);

  const goToDocument = useCallback(
    (documentId: string) => {
      const started = performance.now();
      setCurrentId(documentId);
      recordReviewTiming({
        phase: get(documentId).status === "ready" ? "warm_file" : "cold_file",
        ms: elapsedMs(started),
        documentId,
      });
    },
    [get],
  );

  const handleReviewSuccess = useCallback(
    (result: ReviewDocumentQueueSuccess) => {
      const transitionStart = reviewStartedAt.current ?? performance.now();
      setQueue(result.queue);
      if (!result.nextId) {
        setDone(true);
        window.history.replaceState(null, "", reviewDoneHref(filters));
        recordReviewTiming({
          phase: "post_review_transition",
          ms: elapsedMs(transitionStart),
          documentId: currentId,
        });
        return;
      }
      startTransition(() => {
        void (async () => {
          await ensureMetadata([result.nextId!]);
          setCurrentId(result.nextId!);
          recordReviewTiming({
            phase: "post_review_transition",
            ms: elapsedMs(transitionStart),
            documentId: result.nextId!,
          });
          void runPreload(result.nextId!, result.queue, views);
        })();
      });
    },
    [currentId, ensureMetadata, filters, runPreload, views],
  );

  const resyncQueue = useCallback(async () => {
    const refreshed = await refreshReviewQueueAction(filters);
    if (!("queue" in refreshed)) return;
    setQueue(refreshed.queue);
    if (refreshed.queue.length === 0) {
      setDone(true);
      window.history.replaceState(null, "", reviewDoneHref(filters));
    }
  }, [filters]);

  if (done) {
    return (
      <div className={styles.main}>
        <p role="status">{it.adminDocumentsDone}</p>
        <Link href={`/admin/documenti${reviewQueueQuery(filters)}`} className={styles.back}>
          <Icon name="back" size={16} />
          {it.adminBackToDocuments}
        </Link>
      </div>
    );
  }

  if (!document) {
    return (
      <div className={styles.main}>
        <p role="status">{it.adminReviewLoading}</p>
        <Button type="button" variant="secondary" onClick={() => void resyncQueue()}>
          {it.adminReviewFileRetry}
        </Button>
      </div>
    );
  }

  const team = document.registration.team;
  const editionLabel = `${team.edition.competition.name} · ${team.edition.name}`;
  const rejectReason = document.reviews[0]?.decision === "REJECTED" ? document.reviews[0].reason : null;
  const cachedFile = get(document.id);

  return (
    <>
      <p>
        <Link href={`/admin/documenti${reviewQueueQuery(filters)}`} className={styles.back}>
          <Icon name="back" size={16} />
          {it.adminBackToDocuments}
        </Link>
      </p>

      <div className={styles.reviewGrid}>
        <section className={styles.viewerCol} aria-label={it.adminDocumentTitle}>
          <CertificateViewer
            key={document.id}
            documentId={document.id}
            mimeType={document.mimeType}
            available={Boolean(fileAvailable)}
            prefetchedUrl={cachedFile.status === "ready" ? cachedFile.objectUrl : null}
            loading={cachedFile.status === "loading" || cachedFile.status === "idle"}
          />
        </section>

        <aside className={styles.sideCol}>
          <div className={styles.reviewCard}>
            <div className={styles.nav}>
              <Button
                type="button"
                variant="secondary"
                disabled={!position.prevId}
                onClick={() => position.prevId && goToDocument(position.prevId)}
              >
                {it.adminReviewPrev}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!position.nextId}
                onClick={() => position.nextId && goToDocument(position.nextId)}
              >
                {it.adminReviewNext}
              </Button>
            </div>
            <p className={styles.progress} role="status">
              {position.inQueue && position.position != null
                ? `${it.adminReviewDocument} ${position.position} ${it.adminReviewOf} ${position.total}`
                : it.adminReviewLeftQueue}
              {" · "}
              {it.adminReviewRemaining}: {position.remaining}
            </p>

            <div className={styles.identity}>
              <h1>
                {document.playerProfile.firstName} {document.playerProfile.lastName}
              </h1>
              <StatusChip tone={statusTone(document.status)}>{statusLabel(document.status)}</StatusChip>
            </div>
            <p className={styles.meta}>
              {it.birthDate}:{" "}
              <strong>
                {document.playerProfile.birthDate ? birthLabel(document.playerProfile.birthDate) : "—"}
              </strong>
            </p>
            <p className={styles.meta}>
              {it.adminTeam}: <strong>{team.name}</strong>
            </p>
            <p className={styles.meta}>
              {it.adminEdition}: <strong>{editionLabel}</strong>
            </p>
            <p className={styles.meta}>
              {it.adminReviewFile}: <strong>{fileKind(document.mimeType)}</strong>
              {" · "}
              {document.originalFilename}
              {" · "}
              {fileSize(document.sizeBytes)}
            </p>
            <p className={styles.meta}>
              {it.adminReviewUploaded}: <strong>{romeDate(document.uploadedAt)}</strong>
            </p>
            {rejectReason ? (
              <p className={styles.meta}>
                {it.medicalRejectReason}: {rejectReason}
              </p>
            ) : null}

            {pending && canReview ? (
              <ReviewForm
                key={document.id}
                documentId={document.id}
                teamId={filters.teamId}
                queueQ={filters.q}
                queueFlow
                onQueueSuccess={handleReviewSuccess}
                onQueueAttempt={() => {
                  reviewStartedAt.current = performance.now();
                }}
                onStaleQueue={() => void resyncQueue()}
              />
            ) : (
              <div className={styles.closed}>
                {!pending ? <p>{it.adminDocumentClosed}</p> : null}
                {fileAvailable ? <OpenDocumentButton documentId={document.id} /> : null}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

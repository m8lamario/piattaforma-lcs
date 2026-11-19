"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/Icon";
import { it } from "@/shared/i18n/it";
import { LegalProse } from "./LegalProse";
import { endMarkerIsVisible, scrollerReachedEnd } from "./legalReaderScroll";
import styles from "./ConsentForm.module.css";
import type { ConsentDocumentView } from "./PrivacyConsentForm";

type Props = {
  document: ConsentDocumentView;
  read: boolean;
  onRead?: () => void;
};

function useCanPortal() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function LegalReader({ document, read, onRead }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const canPortal = useCanPortal();
  const [open, setOpen] = useState(false);
  const [reached, setReached] = useState(read);
  const [trackedVersion, setTrackedVersion] = useState(document.versionId);
  if (trackedVersion !== document.versionId) {
    setTrackedVersion(document.versionId);
    setReached(read);
  }
  const canClose = read || reached;

  const markRead = useCallback(() => {
    setReached(true);
    onRead?.();
  }, [onRead]);

  const markIfEnded = useCallback(() => {
    const end = endRef.current;
    if (end) {
      const rect = end.getBoundingClientRect();
      const visual = window.visualViewport;
      const viewport = {
        top: visual?.offsetTop ?? 0,
        height: visual?.height ?? window.innerHeight,
      };
      if (endMarkerIsVisible(rect, viewport)) {
        markRead();
        return;
      }
    }
    const scrollers = [scrollerRef.current, dialogRef.current];
    if (
      scrollers.some(
        (el) => el !== null && el.scrollHeight > el.clientHeight + 8 && scrollerReachedEnd(el),
      )
    ) {
      markRead();
    }
  }, [markRead]);

  function openDialog() {
    setOpen(true);
  }

  useEffect(() => {
    if (!open || !canPortal) return;
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, [open, canPortal]);

  const closeDialog = useCallback(() => {
    if (!canClose) return;
    dialogRef.current?.close();
    setOpen(false);
  }, [canClose]);

  function jumpToEnd() {
    const targets = [scrollerRef.current, dialogRef.current];
    for (const el of targets) {
      if (el && el.scrollHeight > el.clientHeight + 8) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    }
    window.setTimeout(() => markRead(), 350);
  }

  useEffect(() => {
    if (!open || read || reached) return;
    let frame = 0;
    const tick = () => {
      markIfEnded();
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    const onMove = () => markIfEnded();
    const root = window.document;
    root.addEventListener("scroll", onMove, true);
    root.addEventListener("touchend", onMove, true);
    window.visualViewport?.addEventListener("scroll", onMove);
    window.visualViewport?.addEventListener("resize", onMove);
    return () => {
      window.cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onMove, true);
      root.removeEventListener("touchend", onMove, true);
      window.visualViewport?.removeEventListener("scroll", onMove);
      window.visualViewport?.removeEventListener("resize", onMove);
    };
  }, [open, read, reached, markIfEnded]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function onCancel(event: Event) {
      if (!canClose) {
        event.preventDefault();
        return;
      }
      setOpen(false);
    }

    function onClick(event: MouseEvent) {
      if (event.target !== dialog) return;
      if (canClose) closeDialog();
    }

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("click", onClick);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onClick);
    };
  }, [canClose, closeDialog, canPortal]);

  const dialog = (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.dialogHead}>
        <div>
          <p className={styles.version}>
            {it.consentVersion} {document.version}
          </p>
          <h3 id={titleId}>{document.title}</h3>
        </div>
        <Button type="button" variant="ghost" icon="close" onClick={closeDialog} disabled={!canClose}>
          {it.navClose}
        </Button>
      </div>
      <div ref={scrollerRef} className={styles.dialogBody} data-legal-scroller onScroll={markIfEnded}>
        <LegalProse body={document.body} plain />
        <div ref={endRef} className={styles.dialogEnd} aria-hidden="true" />
      </div>
      <div className={styles.dialogFoot}>
        <p className={styles.dialogHint}>{canClose ? it.consentReadDone : it.consentReadScroll}</p>
        <div className={styles.dialogFootActions}>
          {canClose ? null : (
            <Button type="button" variant="secondary" onClick={jumpToEnd}>
              {it.consentReadJump}
            </Button>
          )}
          <Button type="button" onClick={closeDialog} disabled={!canClose}>
            {it.consentReadClose}
          </Button>
        </div>
      </div>
    </dialog>
  );

  return (
    <div className={styles.reader}>
      <div className={styles.headline}>
        <h2>{document.title}</h2>
        <p className={styles.version}>
          {it.consentVersion} {document.version}
        </p>
      </div>
      <p className={styles.readerHint}>{it.consentReadHint}</p>
      <div className={styles.readerActions}>
        <Button type="button" variant="accent" icon="eye" className={styles.readButton} onClick={openDialog}>
          {read ? it.consentReadAgain : it.consentRead}
        </Button>
        {read ? (
          <p className={styles.readBadge} role="status">
            <Icon name="check" size={16} />
            {it.consentReadDone}
          </p>
        ) : null}
      </div>

      {canPortal && open ? createPortal(dialog, window.document.body) : null}
    </div>
  );
}

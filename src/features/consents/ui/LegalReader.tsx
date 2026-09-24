"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Icon } from "@/shared/ui/Icon";
import { it } from "@/shared/i18n/it";
import { LegalProse } from "./LegalProse";
import styles from "./ConsentForm.module.css";
import type { ConsentDocumentView } from "./PrivacyConsentForm";

type Props = {
  document: ConsentDocumentView;
  read: boolean;
  onRead: () => void;
};

const BOTTOM_PX = 28;

function reachedEnd(el: HTMLElement) {
  return el.scrollHeight - el.clientHeight - el.scrollTop <= BOTTOM_PX;
}

export function LegalReader({ document, read, onRead }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [reached, setReached] = useState(read);
  const canClose = read || reached;

  const markIfEnded = useCallback(() => {
    if (!dialogRef.current?.open) return;
    const el = scrollerRef.current;
    if (!el) return;
    if (!reachedEnd(el)) return;
    setReached(true);
    onRead();
  }, [onRead]);

  function openDialog() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    setOpen(true);
    if (!dialog.open) dialog.showModal();
  }

  const closeDialog = useCallback(() => {
    if (!canClose) return;
    dialogRef.current?.close();
    setOpen(false);
  }, [canClose]);

  useEffect(() => {
    if (!open) return;
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => markIfEnded());
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    const frame = window.requestAnimationFrame(() => markIfEnded());
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [open, markIfEnded]);

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
  }, [canClose, closeDialog]);

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
        </div>
        <div className={styles.dialogFoot}>
          <p className={styles.dialogHint}>{canClose ? it.consentReadDone : it.consentReadScroll}</p>
          <Button type="button" onClick={closeDialog} disabled={!canClose}>
            {it.consentReadClose}
          </Button>
        </div>
      </dialog>
    </div>
  );
}

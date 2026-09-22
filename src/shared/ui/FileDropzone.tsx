"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { it } from "@/shared/i18n/it";
import { acceptsFile } from "./fileAccept";
import { Icon } from "./Icon";
import { IndeterminateProgress } from "./Skeleton";
import styles from "./FileDropzone.module.css";

type Props = {
  id?: string;
  name: string;
  label: string;
  help?: string;
  accept: string;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  error?: string | null;
  existingName?: string | null;
  existingSlot?: ReactNode;
};

export function FileDropzone({
  id,
  name,
  label,
  help,
  accept,
  required = false,
  disabled = false,
  uploading = false,
  error = null,
  existingName = null,
  existingSlot,
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = `${inputId}-help`;
  const statusId = `${inputId}-status`;
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function assignFile(file: File | null) {
    const input = inputRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    if (file) transfer.items.add(file);
    input.files = transfer.files;
    setSelectedName(file?.name ?? null);
  }

  function takeFile(file: File | undefined) {
    if (!file) return;
    if (!acceptsFile(file, accept)) {
      assignFile(null);
      setLocalError(it.fileDropInvalidType);
      return;
    }
    setLocalError(null);
    assignFile(file);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    takeFile(event.target.files?.[0]);
  }

  function onDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    if (!disabled && !uploading) setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  function onDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled || uploading) return;
    takeFile(event.dataTransfer.files?.[0]);
  }

  const shownError = localError ?? error;
  const dropClass = uploading
    ? styles.uploading
    : shownError
      ? styles.isError
      : selectedName
        ? styles.selected
        : "";

  return (
    <div className={styles.wrap}>
      {existingName ? (
        <div className={styles.uploaded}>
          <span className={styles.uploadedIcon} aria-hidden="true">
            <Icon name="documents" size={18} />
          </span>
          <div className={styles.uploadedCopy}>
            <p className={styles.kicker}>{it.fileExisting}</p>
            <p className={styles.filename}>{existingName}</p>
          </div>
          {existingSlot ? <div className={styles.uploadedAction}>{existingSlot}</div> : null}
        </div>
      ) : null}

      <label
        className={`${styles.drop} ${dropClass} ${dragging ? styles.dragging : ""}`}
        htmlFor={inputId}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          className={styles.input}
          type="file"
          accept={accept}
          required={required && !existingName}
          disabled={disabled || uploading}
          onChange={onChange}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={`${helpId} ${statusId}`}
          aria-label={label}
        />
        <span className={styles.glyph} aria-hidden="true">
          <Icon name={uploading ? "upload" : selectedName ? "check" : shownError ? "alert" : "upload"} size={22} />
        </span>
        <span className={styles.copy}>
          <span className={styles.title}>{selectedName ? it.fileSelected : label}</span>
          <span id={statusId} className={styles.status} role="status">
            {uploading ? it.fileUploading : selectedName ? selectedName : dragging ? it.fileDropDrop : it.fileDropHint}
          </span>
        </span>
        <span className={styles.browse}>{it.fileDropBrowse}</span>
      </label>

      {uploading ? <IndeterminateProgress label={it.loadingUpload} /> : null}

      {help ? (
        <p id={helpId} className={styles.help}>
          {help}
        </p>
      ) : (
        <span id={helpId} className="srOnly">
          {it.fileDropHint}
        </span>
      )}
      {shownError ? (
        <p className={styles.error} role="alert">
          {shownError}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { acceptsFile } from "./fileAccept";
import { Icon } from "./Icon";
import { IndeterminateProgress } from "./Skeleton";
import styles from "./FileDropzone.module.css";

export type FileDropzoneCopy = {
  invalidType: string;
  tooLarge: string;
  existing: string;
  selected: string;
  uploading: string;
  drop: string;
  hint: string;
  browse: string;
  loading: string;
};

type Props = {
  id?: string;
  name: string;
  label: string;
  help?: string;
  accept: string;
  maxBytes?: number;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  error?: string | null;
  existingName?: string | null;
  existingSlot?: ReactNode;
  copy: FileDropzoneCopy;
};

export function FileDropzone({
  id,
  name,
  label,
  help,
  accept,
  maxBytes,
  required = false,
  disabled = false,
  uploading = false,
  error = null,
  existingName = null,
  existingSlot,
  copy,
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
      setLocalError(copy.invalidType);
      return;
    }
    if (maxBytes !== undefined && file.size > maxBytes) {
      assignFile(null);
      setLocalError(copy.tooLarge);
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
            <p className={styles.kicker}>{copy.existing}</p>
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
          <span className={styles.title}>{selectedName ? copy.selected : label}</span>
          <span id={statusId} className={styles.status} role="status">
            {uploading ? copy.uploading : selectedName ? selectedName : dragging ? copy.drop : copy.hint}
          </span>
        </span>
        <span className={styles.browse}>{copy.browse}</span>
      </label>

      {uploading ? <IndeterminateProgress label={copy.loading} /> : null}

      {help ? (
        <p id={helpId} className={styles.help}>
          {help}
        </p>
      ) : (
        <span id={helpId} className="srOnly">
          {copy.hint}
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

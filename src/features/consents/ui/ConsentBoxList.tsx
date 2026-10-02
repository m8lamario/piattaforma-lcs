"use client";

import { it } from "@/shared/i18n/it";
import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import styles from "./ConsentForm.module.css";

const KIND_COPY: Record<ConsentBoxDef["kind"], string> = {
  required: it.boxRequired,
  play: it.boxPlay,
  optional: it.boxOptional,
  opt_out: it.boxOptOut,
  confirmation: it.boxOptional,
};

type Props = {
  boxes: ConsentBoxDef[];
  values: Record<string, boolean>;
  onToggle: (code: string, accepted: boolean) => void;
  disabled?: boolean;
};

export function ConsentBoxList({ boxes, values, onToggle, disabled }: Props) {
  if (boxes.length === 0) return null;
  return (
    <fieldset className={styles.boxList}>
      <legend className={styles.boxLegend}>{it.consentBoxesHelp}</legend>
      {boxes.map((box) => {
        const label = it[box.labelKey];
        return (
          <label key={box.code} className={styles.check} htmlFor={`box-${box.code}`}>
            <input
              id={`box-${box.code}`}
              type="checkbox"
              name={`box:${box.code}`}
              checked={Boolean(values[box.code])}
              disabled={disabled}
              onChange={(event) => onToggle(box.code, event.target.checked)}
            />
            <span>
              <span className={styles.boxCode}>
                {box.code} · {KIND_COPY[box.kind]}
              </span>
              {label}
            </span>
          </label>
        );
      })}
      <p className={styles.boxFoot}>{it.boxFootnote}</p>
    </fieldset>
  );
}

"use client";

import { it } from "@/shared/i18n/it";
import { groupedConsentBoxes, type ConsentBoxDef } from "@/features/consents/domain/boxes";
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
  grouped?: boolean;
  showHelp?: boolean;
  showFootnote?: boolean;
};

function boxClass(box: ConsentBoxDef) {
  if (box.kind === "opt_out") return `${styles.check} ${styles.checkOptOut}`;
  if (box.code === "G14" || box.kind === "confirmation") return `${styles.check} ${styles.checkConfirm}`;
  return styles.check;
}

function BoxRow({
  box,
  checked,
  disabled,
  onToggle,
}: {
  box: ConsentBoxDef;
  checked: boolean;
  disabled?: boolean;
  onToggle: (code: string, accepted: boolean) => void;
}) {
  return (
    <label className={boxClass(box)} htmlFor={`box-${box.code}`}>
      <input
        id={`box-${box.code}`}
        type="checkbox"
        name={`box:${box.code}`}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onToggle(box.code, event.target.checked)}
      />
      <span>
        <span className={styles.boxCode}>
          {box.code} · {KIND_COPY[box.kind]}
        </span>
        {it[box.labelKey]}
      </span>
    </label>
  );
}

export function ConsentBoxList({
  boxes,
  values,
  onToggle,
  disabled,
  grouped = false,
  showHelp = true,
  showFootnote = true,
}: Props) {
  if (boxes.length === 0) return null;

  function renderBoxes(list: ConsentBoxDef[]) {
    return list.map((box) => (
      <BoxRow key={box.code} box={box} checked={Boolean(values[box.code])} disabled={disabled} onToggle={onToggle} />
    ));
  }

  if (!grouped) {
    const inner = (
      <>
        {renderBoxes(boxes)}
        {showFootnote ? <p className={styles.boxFoot}>{it.boxFootnote}</p> : null}
      </>
    );
    if (!showHelp) return <div className={styles.boxList}>{inner}</div>;
    return (
      <fieldset className={styles.boxList}>
        <legend className={styles.boxLegend}>{it.consentBoxesHelp}</legend>
        {inner}
      </fieldset>
    );
  }

  const groups = groupedConsentBoxes(boxes);
  return (
    <div className={styles.boxList}>
      {showHelp ? <p className={styles.boxLegend}>{it.consentBoxesHelp}</p> : null}
      {groups.required.length > 0 ? <div className={styles.boxGroup}>{renderBoxes(groups.required)}</div> : null}
      {groups.optional.length > 0 ? <div className={styles.boxGroup}>{renderBoxes(groups.optional)}</div> : null}
      {groups.optOut.length > 0 ? <div className={styles.boxGroup}>{renderBoxes(groups.optOut)}</div> : null}
      {showFootnote ? <p className={styles.boxFoot}>{it.boxFootnote}</p> : null}
    </div>
  );
}

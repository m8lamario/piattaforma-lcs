import type { ConsentBoxDef } from "@/features/consents/domain/boxes";
import { ErasureForm } from "@/features/consents/ui/ErasureForm";
import { RevokeConsentForm } from "@/features/consents/ui/RevokeConsentForm";
import { ButtonLink } from "@/shared/ui/Button";
import { Panel } from "@/shared/ui/Panel";
import { StatusChip } from "@/shared/ui/StatusChip";
import { it } from "@/shared/i18n/it";
import fields from "@/shared/ui/form.module.css";
import styles from "./ConsentsManager.module.css";

export type ConsentRowView = {
  box: ConsentBoxDef;
  accepted: boolean;
  active: boolean;
  value?: string | null;
  revocable: boolean;
};

type Props = {
  rows: ConsentRowView[];
};

export function ConsentsManager({ rows }: Props) {
  const activeCount = rows.filter((row) => row.active).length;

  return (
    <>
      <Panel
        title={it.consentsChoicesPanel}
        icon="privacy"
        flush
        action={
          <StatusChip tone={activeCount > 0 ? "complete" : "neutral"}>
            {it.consentsActiveCount.replace("{active}", String(activeCount)).replace("{total}", String(rows.length))}
          </StatusChip>
        }
      >
        <ul className={styles.list}>
          {rows.map((row) => {
            const [title, ...rest] = it[row.box.labelKey].split(" — ");
            const detail = rest.join(" — ");
            return (
              <li key={row.box.code} className={`${styles.row} ${row.active ? styles.rowActive : ""}`}>
                <div className={styles.copy}>
                  <span className={styles.code}>{row.box.code}</span>
                  <h3 className={styles.label}>{title}</h3>
                  {detail ? <p className={styles.detail}>{detail}</p> : null}
                  {row.value ? <span className={styles.value}>{row.value}</span> : null}
                </div>
                <div className={styles.side}>
                  <StatusChip tone={row.active ? "complete" : "neutral"}>
                    {row.active ? it.consentsActive : it.consentsInactive}
                  </StatusChip>
                  {row.revocable ? <RevokeConsentForm code={row.box.code} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title={it.consentsDataPanel} icon="download">
        <p className={fields.help}>{it.consentsExportLead}</p>
        <div className={fields.actions}>
          <ButtonLink href="/area/consensi/export?format=json" variant="secondary" icon="download">
            {it.consentsExportJson}
          </ButtonLink>
          <ButtonLink href="/area/consensi/export?format=txt" variant="secondary" icon="download">
            {it.consentsExportText}
          </ButtonLink>
        </div>
        <ErasureForm />
      </Panel>
    </>
  );
}

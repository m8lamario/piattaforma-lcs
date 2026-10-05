import type { ChecklistItem } from "@/features/registrations/domain/requirements";
import { it } from "@/shared/i18n/it";
import { ButtonLink } from "@/shared/ui/Button";
import { ChecklistLinks } from "./ChecklistLinks";
import styles from "./WizardForm.module.css";

type Props = {
  checklist: ChecklistItem[];
};

export function SummaryStep({ checklist }: Props) {
  return (
    <div className={styles.placeholder}>
      <p>{it.summaryIntro}</p>
      <p>{it.summaryWhatNow}</p>
      <ChecklistLinks checklist={checklist} />
      <p>
        <ButtonLink href="/area">{it.backToArea}</ButtonLink>
      </p>
    </div>
  );
}

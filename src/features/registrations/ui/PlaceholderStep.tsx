import { ButtonLink } from "@/shared/ui/Button";
import { it } from "@/shared/i18n/it";
import styles from "./WizardForm.module.css";

type Props = {
  title: string;
  body: string;
};

export function PlaceholderStep({ title, body }: Props) {
  return (
    <div className={styles.placeholder}>
      <p>
        <strong>{it.upcomingStepTitle}.</strong> {title}
      </p>
      <p>{body}</p>
      <p>
        <ButtonLink href="/area" variant="ghost">
          {it.backToArea}
        </ButtonLink>
      </p>
    </div>
  );
}

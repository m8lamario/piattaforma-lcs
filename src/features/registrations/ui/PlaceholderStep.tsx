import Link from "next/link";
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
        <Link href="/area">{it.backToArea}</Link>
      </p>
    </div>
  );
}

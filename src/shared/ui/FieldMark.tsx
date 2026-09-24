import Image from "next/image";
import styles from "./FieldMark.module.css";

type Props = {
  variant?: "wash" | "corner";
};

export function FieldMark({ variant = "wash" }: Props) {
  return (
    <div className={variant === "corner" ? styles.corner : styles.wash} aria-hidden="true">
      <Image
        src="/logoLCSw.png"
        alt=""
        width={393}
        height={524}
        className={styles.logo}
        style={{ display: "none" }}
      />
    </div>
  );
}

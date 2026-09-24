import type { ReactNode } from "react";
import { Icon } from "./Icon";
import fields from "./form.module.css";

type Props = {
  id?: string;
  tone: "danger" | "ok";
  children: ReactNode;
};

export function FieldStatus({ id, tone, children }: Props) {
  return (
    <p
      id={id}
      className={`${fields.fieldStatus} ${tone === "ok" ? fields.fieldStatusOk : fields.fieldStatusDanger}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className={fields.fieldStatusMark}>
        <Icon name={tone === "ok" ? "check" : "alert"} size={14} />
      </span>
      <span>{children}</span>
    </p>
  );
}

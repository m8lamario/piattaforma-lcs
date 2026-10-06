"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/shared/ui/Button";
import type { IconName } from "@/shared/ui/Icon";

type Props = {
  idle: string;
  pendingLabel: string;
  variant?: ButtonVariant;
  icon?: IconName;
  iconPosition?: "left" | "right";
  className?: string;
  formAction?: ButtonHTMLAttributes<HTMLButtonElement>["formAction"];
};

export function PendingSubmitButton({
  idle,
  pendingLabel,
  variant = "primary",
  icon,
  iconPosition = "left",
  className,
  formAction,
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      icon={icon}
      iconPosition={iconPosition}
      className={className}
      disabled={pending}
      aria-busy={pending}
      formAction={formAction}
    >
      {pending ? pendingLabel : idle}
    </Button>
  );
}

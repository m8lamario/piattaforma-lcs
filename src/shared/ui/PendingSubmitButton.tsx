"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/shared/ui/Button";
import type { IconName } from "@/shared/ui/Icon";

type Props = {
  idle: string;
  pendingLabel: string;
  variant?: ButtonVariant;
  icon?: IconName;
  iconPosition?: "left" | "right";
};

export function PendingSubmitButton({
  idle,
  pendingLabel,
  variant = "primary",
  icon,
  iconPosition = "left",
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      icon={icon}
      iconPosition={iconPosition}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : idle}
    </Button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./Icon";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "accent" | "ghost" | "secondary" | "danger" | "success" | "warning";

type SharedProps = {
  variant?: ButtonVariant;
  icon?: IconName;
  iconPosition?: "left" | "right";
  className?: string;
  children: ReactNode;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & SharedProps;

function classes(variant: ButtonVariant, className?: string) {
  return [styles.button, styles[variant], className].filter(Boolean).join(" ");
}

function ButtonContent({
  icon,
  iconPosition = "left",
  children,
}: {
  icon?: IconName;
  iconPosition?: "left" | "right";
  children: ReactNode;
}) {
  if (!icon) return children;
  const glyph = <Icon name={icon} size={18} className={styles.icon} />;
  return iconPosition === "right" ? (
    <>
      {children}
      {glyph}
    </>
  ) : (
    <>
      {glyph}
      {children}
    </>
  );
}

export function Button({
  variant = "primary",
  icon,
  iconPosition = "left",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={classes(variant, className)} {...props}>
      <ButtonContent icon={icon} iconPosition={iconPosition}>
        {children}
      </ButtonContent>
    </button>
  );
}

type ButtonLinkProps = SharedProps & {
  href: string;
};

export function ButtonLink({
  href,
  variant = "primary",
  icon,
  iconPosition = "left",
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={classes(variant, className)}>
      <ButtonContent icon={icon} iconPosition={iconPosition}>
        {children}
      </ButtonContent>
    </Link>
  );
}

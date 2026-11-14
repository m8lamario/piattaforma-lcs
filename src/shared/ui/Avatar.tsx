import styles from "./Avatar.module.css";

type Props = {
  name: string;
  size?: "sm" | "md";
  muted?: boolean;
};

export function initialsOf(name: string) {
  const parts = name
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ name, size = "md", muted = false }: Props) {
  return (
    <span
      className={[styles.avatar, size === "sm" ? styles.small : undefined, muted ? styles.muted : undefined]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

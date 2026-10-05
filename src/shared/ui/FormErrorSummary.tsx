import { it } from "@/shared/i18n/it";
import fields from "./form.module.css";

type Props = {
  messages: string[];
};

export function FormErrorSummary({ messages }: Props) {
  const unique = [...new Set(messages.filter(Boolean))];
  if (unique.length === 0) return null;

  return (
    <div className={fields.summary} role="alert">
      <p className={fields.summaryTitle}>{it.formErrorSummary}</p>
      <ul className={fields.summaryList}>
        {unique.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

export function fieldMessages(errors: object) {
  return Object.values(errors as Record<string, { message?: string } | undefined>)
    .map((error) => error?.message)
    .filter((message): message is string => Boolean(message));
}

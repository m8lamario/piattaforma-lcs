import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./LegalProse.module.css";

type Props = {
  body: string;
  plain?: boolean;
};

export function LegalProse({ body, plain = false }: Props) {
  return (
    <div className={plain ? `${styles.sheet} ${styles.plain}` : styles.sheet}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}

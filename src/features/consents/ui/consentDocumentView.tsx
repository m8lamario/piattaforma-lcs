import { LegalProse } from "./LegalProse";
import type { ConsentDocumentView } from "./consentDocument";

export function toConsentDocumentView(input: {
  slug: string;
  title: string;
  version: string;
  versionId: string;
  body: string;
}): ConsentDocumentView {
  return {
    slug: input.slug,
    title: input.title,
    version: input.version,
    versionId: input.versionId,
    prose: <LegalProse body={input.body} plain />,
  };
}

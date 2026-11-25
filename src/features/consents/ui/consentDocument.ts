import type { ReactNode } from "react";

export type ConsentDocumentView = {
  slug: string;
  title: string;
  version: string;
  versionId: string;
  prose: ReactNode;
};

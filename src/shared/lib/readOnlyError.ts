export class ReadOnlyViewError extends Error {
  readonly code = "VIEW_READ_ONLY" as const;

  constructor() {
    super("VIEW_READ_ONLY");
    this.name = "ReadOnlyViewError";
  }
}

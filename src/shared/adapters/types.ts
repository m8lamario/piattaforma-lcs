export type EmailSendInput = {
  to: string;
  subject: string;
  text: string;
  from?: string;
  replyTo?: string | null;
  idempotencyKey?: string;
  tags?: Record<string, string>;
};

export type EmailSendResult = {
  providerMessageId: string | null;
};

export type EmailWebhookEvent = {
  provider: string;
  providerEventId: string;
  type: string;
  providerMessageId: string | null;
  occurredAt: Date;
  bounceType?: string | null;
  summary?: string | null;
};

export class InvalidEmailWebhookSignatureError extends Error {
  constructor() {
    super("Firma webhook email non valida");
    this.name = "InvalidEmailWebhookSignatureError";
  }
}

export interface EmailAdapter {
  readonly provider: string;
  send(input: EmailSendInput): Promise<EmailSendResult>;
  parseWebhook(input: { headers: Headers; rawBody: string }): Promise<EmailWebhookEvent>;
}

export type StoredObject = {
  key: string;
  body: Buffer;
  mimeType: string;
};

export interface StorageAdapter {
  putPrivate(input: StoredObject): Promise<{ key: string }>;
  readPrivate(input: { key: string }): Promise<{ body: Buffer } | null>;
  getSignedReadUrl(input: {
    key: string;
    expiresInSeconds: number;
  }): Promise<{ url: string }>;
  delete(input: { key: string }): Promise<void>;
}

export type PaymentCheckoutInput = {
  amount: number;
  currency: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
};

export type PaymentWebhookEvent = {
  provider: string;
  type: string;
  providerPaymentId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  paymentId?: string;
};

export interface PaymentAdapter {
  createCheckout(
    input: PaymentCheckoutInput,
  ): Promise<{ providerRef: string; redirectUrl: string }>;
  parseWebhook(input: {
    headers: Headers;
    rawBody: string;
  }): Promise<PaymentWebhookEvent>;
}

export interface MonitoringAdapter {
  captureError(error: unknown, context?: Record<string, string>): void;
}

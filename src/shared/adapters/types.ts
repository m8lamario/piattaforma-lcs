export type EmailMessage = {
  to: string;
  template: string;
  variables: Record<string, string>;
};

export interface EmailAdapter {
  send(input: EmailMessage): Promise<void>;
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

interface PayPalActions {
  order: {
    create?: (order: unknown) => Promise<string>;
    capture?: () => Promise<unknown>;
  };
}

interface PayPalApproveData {
  orderID: string;
}

interface PayPalButtonsInstance {
  render: (selector: string) => Promise<void>;
  close?: () => Promise<void>;
}

interface PayPalButtonsOptions {
  style?: Record<string, string>;
  createOrder: (_data: unknown, actions: PayPalActions) => Promise<string>;
  onApprove: (data: PayPalApproveData, actions: PayPalActions) => Promise<void>;
  onCancel: () => void;
  onError: (error: unknown) => void;
}

interface PayPalNamespace {
  Buttons: (options: PayPalButtonsOptions) => PayPalButtonsInstance;
}

interface Window {
  paypal?: PayPalNamespace;
}

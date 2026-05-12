// Declaraciones TypeScript minimas para el SDK global de PayPal.
// PayPal se carga por <script>, por eso TypeScript no conoce `window.paypal` automaticamente.
interface PayPalActions {
  // Acciones que PayPal puede exponer durante createOrder/onApprove.
  order: {
    create?: (order: unknown) => Promise<string>;
    capture?: () => Promise<unknown>;
  };
}

// Datos que PayPal entrega cuando el comprador aprueba la orden.
interface PayPalApproveData {
  orderID: string;
}

// Instancia visual del boton PayPal ya configurado.
interface PayPalButtonsInstance {
  render: (selector: string) => Promise<void>;
  close?: () => Promise<void>;
}

// Opciones que le pasamos a window.paypal.Buttons(...)
interface PayPalButtonsOptions {
  style?: Record<string, string>;
  createOrder: (_data: unknown, actions: PayPalActions) => Promise<string>;
  onApprove: (data: PayPalApproveData, actions: PayPalActions) => Promise<void>;
  onCancel: () => void;
  onError: (error: unknown) => void;
}

// Espacio de nombres global que crea el script oficial de PayPal.
interface PayPalNamespace {
  Buttons: (options: PayPalButtonsOptions) => PayPalButtonsInstance;
}

// Extendemos Window para que TypeScript permita usar window.paypal.
interface Window {
  paypal?: PayPalNamespace;
}

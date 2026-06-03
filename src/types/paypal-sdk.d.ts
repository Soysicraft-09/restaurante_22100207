// Tipos minimos para interactuar con el SDK de PayPal sin depender de paquetes externos.
interface PayPalActions {
  // Acciones disponibles sobre la orden creada por el boton de PayPal.
  order: {
    create?: (order: unknown) => Promise<string>;
    capture?: () => Promise<unknown>;
  };
}

// Informacion que PayPal entrega cuando el usuario aprueba el pago.
interface PayPalApproveData {
  orderID: string;
}

// Instancia del boton renderizado por el SDK oficial.
interface PayPalButtonsInstance {
  render: (selector: string) => Promise<void>;
  close?: () => Promise<void>;
}

// Opciones principales que recibe `paypal.Buttons`.
interface PayPalButtonsOptions {
  style?: Record<string, string>;
  createOrder: (_data: unknown, actions: PayPalActions) => Promise<string>;
  onApprove: (data: PayPalApproveData, actions: PayPalActions) => Promise<void>;
  onCancel: () => void;
  onError: (error: unknown) => void;
}

// Espacio de nombres global que el SDK inyecta en window.
interface PayPalNamespace {
  Buttons: (options: PayPalButtonsOptions) => PayPalButtonsInstance;
}

// Extiende window para que TypeScript reconozca la presencia de PayPal.
interface Window {
  paypal?: PayPalNamespace;
}

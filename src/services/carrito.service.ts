import { effect, Injectable, signal } from '@angular/core';
import { MenuItem } from '../models/producto.model';

// Una linea del carrito une el platillo con la cantidad elegida.
// Separar "producto" de "cantidad" evita duplicar platillos completos varias veces.
export interface CartLine {
  item: MenuItem;
  quantity: number;
}

export interface TicketExportOptions {
  folio?: string;
  paymentMethod?: string;
  customerName?: string;
  lines?: CartLine[];
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  // El carrito vive en localStorage para que el usuario no pierda la orden al refrescar.
  private readonly cartStorageKey = 'casa-quetzal-cart-v1';
  private readonly lineasSignal = signal<CartLine[]>(this.readStoredCart());

  // Exponemos solo lectura: los componentes consultan estado, pero las mutaciones pasan por metodos.
  readonly lineas = this.lineasSignal.asReadonly();

  constructor() {
    // effect persiste automaticamente cada cambio del signal.
    effect(() => {
      this.persistCart(this.lineasSignal());
    });
  }

  agregar(item: MenuItem): void {
    this.lineasSignal.update((current) => {
      const index = current.findIndex((linea) => linea.item.id === item.id);

      // Si el producto no existe en el carrito, se crea una nueva linea.
      if (index === -1) {
        return [...current, { item, quantity: 1 }];
      }

      // Si ya existe, NO mutamos el arreglo original: devolvemos uno nuevo para mantener reactividad.
      return current.map((linea, lineIndex) =>
        lineIndex === index ? { ...linea, quantity: linea.quantity + 1 } : linea
      );
    });
  }

  incrementar(id: number): void {
    this.lineasSignal.update((current) =>
      current.map((linea) =>
        linea.item.id === id ? { ...linea, quantity: linea.quantity + 1 } : linea
      )
    );
  }

  decrementar(id: number): void {
    this.lineasSignal.update((current) => {
      const line = current.find((linea) => linea.item.id === id);

      if (!line) {
        return current;
      }

      if (line.quantity <= 1) {
        return current.filter((linea) => linea.item.id !== id);
      }

      return current.map((linea) =>
        linea.item.id === id ? { ...linea, quantity: linea.quantity - 1 } : linea
      );
    });
  }

  eliminar(id: number): void {
    this.lineasSignal.update((current) => current.filter((linea) => linea.item.id !== id));
  }

  vaciar(): void {
    this.lineasSignal.set([]);
  }

  total(): number {
    return this.lineasSignal().reduce(
      (accumulator, line) => accumulator + line.item.price * line.quantity,
      0
    );
  }

  totalItems(): number {
    return this.lineasSignal().reduce((accumulator, line) => accumulator + line.quantity, 0);
  }

  exportarTicketXML(): void {
    this.exportarTicketXMLConOpciones();
  }

  exportarTicketXMLConOpciones(options: TicketExportOptions = {}): void {
    // Este metodo genera el comprobante local de la compra.
    // Si PayPal pago correctamente, Catalogo le pasa folio/metodo/cliente/lineas congeladas.
    // Si el usuario solo descarga ticket del carrito, usa los valores actuales del carrito.
    const now = new Date();
    const ticketId = options.folio ?? `TICKET-${now.getTime()}`;
    const lines = options.lines ?? this.lineasSignal();
    const total = lines.reduce(
      (accumulator, line) => accumulator + line.item.price * line.quantity,
      0
    );

    // Construccion manual del XML para que el alumno vea la estructura del ticket.
    // En produccion convendria usar un builder/serializer si el formato crece.
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<ticket>\n';
    xml += `  <folio>${ticketId}</folio>\n`;
    xml += `  <fecha>${now.toISOString()}</fecha>\n`;
    xml += '  <restaurante>Casa Quetzal</restaurante>\n';
    xml += `  <cliente>${this.escapeXml(options.customerName ?? 'Cliente mostrador')}</cliente>\n`;
    xml += `  <metodo_pago>${this.escapeXml(options.paymentMethod ?? 'No especificado')}</metodo_pago>\n`;
    xml += '  <lineas>\n';

    for (const line of lines) {
      xml += '    <linea>\n';
      xml += `      <id>${line.item.id}</id>\n`;
      xml += `      <producto>${this.escapeXml(line.item.name)}</producto>\n`;
      xml += `      <categoria>${this.escapeXml(line.item.category)}</categoria>\n`;
      xml += `      <cantidad>${line.quantity}</cantidad>\n`;
      xml += `      <precio_unitario>${line.item.price}</precio_unitario>\n`;
      xml += `      <subtotal>${line.item.price * line.quantity}</subtotal>\n`;
      xml += '    </linea>\n';
    }

    xml += '  </lineas>\n';
    xml += `  <total>${total}</total>\n`;
    xml += '</ticket>';

    // Descargar en navegador sin backend:
    // Blob crea el archivo en memoria, ObjectURL crea una URL temporal y un <a> simula el click.
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${ticketId}.xml`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private escapeXml(value: string): string {
    // XML no tolera caracteres reservados crudos; escaparlos evita tickets corruptos.
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }

  private readStoredCart(): CartLine[] {
    try {
      const raw = localStorage.getItem(this.cartStorageKey);

      if (!raw) {
        return [];
      }

      const parsed: unknown = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((line): line is CartLine => this.isCartLine(line))
        // Copia defensiva: lo que sale de localStorage no debe compartir referencias mutables.
        .map((line) => ({ ...line, item: { ...line.item } }));
    } catch {
      return [];
    }
  }

  private persistCart(lines: CartLine[]): void {
    try {
      localStorage.setItem(this.cartStorageKey, JSON.stringify(lines));
    } catch {
      // Ignored: cart persistence is best-effort only.
    }
  }

  private isCartLine(value: unknown): value is CartLine {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const line = value as Partial<CartLine>;

    return (
      typeof line.quantity === 'number' &&
      Number.isFinite(line.quantity) &&
      line.quantity > 0 &&
      this.isMenuItem(line.item)
    );
  }

  private isMenuItem(value: unknown): value is MenuItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const item = value as Partial<MenuItem>;

    return (
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      typeof item.price === 'number' &&
      typeof item.imageUrl === 'string' &&
      typeof item.category === 'string' &&
      typeof item.description === 'string' &&
      typeof item.inStock === 'boolean' &&
      typeof item.pairing === 'string' &&
      typeof item.season === 'string'
    );
  }
}

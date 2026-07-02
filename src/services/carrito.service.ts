import { effect, Injectable, signal } from '@angular/core';
import { MenuItem } from '../models/producto.model';

// [BUSCAR: CARRITO PRODUCTO] Una linea del carrito une el platillo con la cantidad elegida.
// [BUSCAR: PRODUCTO] Separar "producto" de "cantidad" evita duplicar platillos completos varias veces.
export interface CartLine {
  item: MenuItem;
  quantity: number;
}


@Injectable({ providedIn: 'root' })
export class CarritoService {
  readonly ivaRate = 0.16;
  // [BUSCAR: USUARIO CARRITO PEDIDO] El carrito vive en localStorage para que el usuario no pierda la orden al refrescar.
  private readonly cartStorageKey = 'casa-quetzal-cart-v1';
  private readonly lineasSignal = signal<CartLine[]>(this.readStoredCart());

  // [BUSCAR: CARRITO] Exponemos solo lectura: los componentes consultan estado, pero las mutaciones pasan por metodos.
  readonly lineas = this.lineasSignal.asReadonly();

  constructor() {
    // [BUSCAR: ANGULAR RENDIMIENTO] effect persiste automaticamente cada cambio del signal.
    effect(() => {
      this.persistCart(this.lineasSignal());
    });
  }

  agregar(item: MenuItem): void {
    this.lineasSignal.update((current) => {
      const index = current.findIndex((linea) => linea.item.id === item.id);

      // [BUSCAR: CARRITO PRODUCTO] Si el producto no existe en el carrito, se crea una nueva linea.
      if (index === -1) {
        return [...current, { item, quantity: 1 }];
      }

      // [BUSCAR: CARRITO] Si ya existe, NO mutamos el arreglo original: devolvemos uno nuevo para mantener reactividad.
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

  subtotal(): number {
    return this.lineasSignal().reduce(
      (accumulator, line) => accumulator + line.item.price * line.quantity,
      0
    );
  }

  iva(): number {
    return this.subtotal() * this.ivaRate;
  }

  total(): number {
    return this.subtotal() + this.iva();
  }

  totalItems(): number {
    return this.lineasSignal().reduce((accumulator, line) => accumulator + line.quantity, 0);
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
        // [BUSCAR: CARRITO] Copia defensiva: lo que sale de localStorage no debe compartir referencias mutables.
        .map((line) => ({ ...line, item: { ...line.item } }));
    } catch {
      return [];
    }
  }

  private persistCart(lines: CartLine[]): void {
    try {
      localStorage.setItem(this.cartStorageKey, JSON.stringify(lines));
    } catch {
      // [BUSCAR: CARRITO RENDIMIENTO] Ignored: cart persistence is best-effort only.
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

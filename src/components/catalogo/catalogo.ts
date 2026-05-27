import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuItem } from '../../models/producto.model';
import { CartLine, CarritoService } from '../../services/carrito.service';
import { ProductService } from '../../services/producto.service';
import { paypalConfig } from '../../environments/paypal.config';
import { ProductoCard } from '../producto-card/producto-card';

// Estas interfaces documentan la informacion estatica de la landing.
// En una app real podrian venir de CMS, pero aqui mantenerlas tipadas ayuda a estudiar Angular.
interface InsightCard {
  value: string;
  title: string;
  detail: string;
}

interface ExperiencePillar {
  title: string;
  description: string;
}

interface Commitment {
  title: string;
  description: string;
}

interface ChefMilestone {
  year: string;
  title: string;
  detail: string;
}

interface DeliveryStep {
  title: string;
  detail: string;
}

type CheckoutStep = 1 | 2 | 3;
type OrderStatus = 'recibido' | 'preparando' | 'en-camino' | 'entregado';
type PaymentMethod = 'Tarjeta' | 'Transferencia' | 'Efectivo' | 'PayPal';

@Component({
  selector: 'app-catalogo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProductoCard, ReactiveFormsModule, CurrencyPipe],
  host: {
    '(document:keydown.escape)': 'handleEscape()',
  },
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnDestroy {
  // Clave versionada: si cambia la forma de guardar favoritos, se puede migrar sin romper datos viejos.
  private readonly favoritesStorageKey = 'casa-quetzal-favorites-v1';
  private readonly productService = inject(ProductService);
  private readonly carritoService = inject(CarritoService);
  private readonly paypalApiUrl = 'http://localhost:3000/api/paypal';
  private readonly currencyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });
  private readonly orderTimers: number[] = [];
  private paypalButtonsRendered = false;

  readonly menuItems = signal<MenuItem[]>([]);
  readonly errorMessage = signal('');
  readonly selectedCategory = signal('Todas');
  readonly onlyAvailable = signal(false);
  readonly searchTerm = signal('');
  readonly favoriteIds = signal<number[]>(this.readFavoriteIds());
  readonly selectedItem = signal<MenuItem | null>(null);
  readonly checkoutOpen = signal(false);
  readonly checkoutStep = signal<CheckoutStep>(1);
  readonly checkoutError = signal('');
  readonly orderStatus = signal<OrderStatus | null>(null);
  readonly orderCode = signal('');
  readonly paypalMessage = signal('');
  readonly cartLines = this.carritoService.lineas;

  // Reactive Forms centraliza validacion y estado del checkout.
  // PayPal se renderiza con el SDK oficial en el paso final, cuando ya conocemos total y cliente.
  // La orden se crea y captura en backend para NO exponer el Client Secret en Angular.
  readonly checkoutForm = new FormGroup({
    customerName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    deliveryNotes: new FormControl('', { nonNullable: true }),
    deliveryTime: new FormControl('Lo antes posible', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    paymentMethod: new FormControl<PaymentMethod>('Tarjeta', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    cardLast4: new FormControl('', { nonNullable: true }),
  });

  // computed recalcula derivaciones cuando cambian los signals de los que depende.
  readonly favoriteSet = computed(() => new Set(this.favoriteIds()));
  readonly favoriteItems = computed(() => {
    const favoriteIds = this.favoriteSet();
    return this.menuItems().filter((item) => favoriteIds.has(item.id));
  });

  readonly availableCount = computed(() =>
    this.menuItems().filter((dish) => dish.inStock).length
  );

  readonly cartItemsCount = computed(() => this.carritoService.totalItems());
  readonly cartTotal = computed(() => this.carritoService.total());

  readonly categoriesCount = computed(() => new Set(this.menuItems().map((dish) => dish.category)).size);

  readonly menuCategories = computed(() => {
    const uniqueCategories = new Set(this.menuItems().map((dish) => dish.category));
    return ['Todas', ...Array.from(uniqueCategories)];
  });

  readonly filteredMenuItems = computed(() => {
    const category = this.selectedCategory();
    const mustBeAvailable = this.onlyAvailable();
    const search = this.searchTerm().trim().toLowerCase();

    return this.menuItems().filter((dish) => {
      const categoryMatches = category === 'Todas' || dish.category === category;
      const availabilityMatches = !mustBeAvailable || dish.inStock;
      const searchMatches =
        search.length === 0 ||
        dish.name.toLowerCase().includes(search) ||
        dish.description.toLowerCase().includes(search) ||
        dish.category.toLowerCase().includes(search);

      return categoryMatches && availabilityMatches && searchMatches;
    });
  });

  readonly mixologyItems = computed(() =>
    this.menuItems().filter((item) => item.category === 'Mixologia')
  );

  readonly recommendedItems = computed(() => {
    const items = this.menuItems();

    if (items.length === 0) {
      return [];
    }

    const favorites = this.favoriteSet();
    const cartIds = new Set(this.cartLines().map((line) => line.item.id));
    const cartCategory = this.cartLines()[0]?.item.category;
    const selectedCategory = this.selectedCategory();

    return items
      .filter((item) => item.inStock && !cartIds.has(item.id))
      .map((item) => {
        let score = 0;

        if (favorites.has(item.id)) {
          score += 5;
        }

        if (cartCategory && item.category === cartCategory) {
          score += 3;
        }

        if (selectedCategory !== 'Todas' && item.category === selectedCategory) {
          score += 2;
        }

        if (item.category === 'Postres') {
          score += 1;
        }

        return { item, score };
      })
      .sort((a, b) => b.score - a.score || a.item.price - b.item.price)
      .slice(0, 4)
      .map((entry) => entry.item);
  });

  readonly estimatedDeliveryMinutes = computed(() => 25 + this.cartItemsCount() * 3);
  readonly orderStatusLabel = computed(() => {
    const status = this.orderStatus();

    switch (status) {
      case 'recibido':
        return 'Pedido recibido';
      case 'preparando':
        return 'Estamos preparando tu orden';
      case 'en-camino':
        return 'Tu pedido va en camino';
      case 'entregado':
        return 'Pedido entregado';
      default:
        return '';
    }
  });

  readonly insightCards: InsightCard[] = [
    {
      value: '12.2%',
      title: 'Peso del sector restaurantero en Mexico',
      detail: 'CANIRAC 2023 confirma un crecimiento sostenido de experiencias premium.',
    },
    {
      value: '95%+',
      title: 'Penetracion digital en segmento objetivo C+ y A/B',
      detail: 'Asociacion de Internet MX 2023 muestra alta adopcion movil y consumo visual.',
    },
    {
      value: '30%',
      title: 'Gasto destinado a esparcimiento y experiencias',
      detail: 'INEGI 2022 respalda la viabilidad de tickets altos cuando hay diferenciacion.',
    },
  ];

  readonly pillars: ExperiencePillar[] = [
    {
      title: 'Cocina de autor con raiz mexicana',
      description:
        'Cada plato cuenta una historia regional: tecnica contemporanea, ingredientes de origen y montaje editorial.',
    },
    {
      title: 'Mixologia con identidad local',
      description:
        'La barra integra destilados nacionales, frutas de temporada y perfiles aromaticos que armonizan cada tiempo.',
    },
    {
      title: 'Diseno visual premium para conversion',
      description:
        'El menu digital esta pensado para capturar atencion, mejorar decision de compra y aumentar pedidos online.',
    },
  ];

  readonly chefMilestones: ChefMilestone[] = [
    {
      year: '2014',
      title: 'Origen del proyecto',
      detail:
        'El chef inicia una investigacion culinaria por Oaxaca, Puebla y Yucatan para reinterpretar tecnicas tradicionales.',
    },
    {
      year: '2019',
      title: 'Nacimiento de Casa Quetzal',
      detail:
        'Arranca el concepto de alta cocina mexicana enfocada en experiencia, fotografia y narrativa culinaria.',
    },
    {
      year: '2026',
      title: 'Formato digital tipo delivery',
      detail:
        'El negocio evoluciona a modelo ficticio de pedidos en linea, sin ubicacion fisica abierta al publico.',
    },
  ];

  readonly commitments: Commitment[] = [
    {
      title: 'Kilometro Cero',
      description:
        'Priorizamos proveedores locales para reducir huella de carbono y fortalecer cadenas de valor regional.',
    },
    {
      title: 'Transparencia legal y comercial',
      description:
        'Mostramos precios en MXN con impuestos incluidos y mantenemos politicas claras de privacidad.',
    },
    {
      title: 'Menu digital vivo',
      description:
        'Actualizamos disponibilidad y costo por inflacion de insumos gourmet sin sacrificar claridad para el comensal.',
    },
  ];

  readonly deliverySteps: DeliveryStep[] = [
    {
      title: '1. Explora y filtra el menu',
      detail: 'Navega por categorias, busca ingredientes y revisa maridajes sugeridos.',
    },
    {
      title: '2. Elige tu experiencia',
      detail: 'Combina entradas, fuertes y mixologia para armar una cena gourmet en casa.',
    },
    {
      title: '3. Pide por app de delivery',
      detail: 'Nuestro modelo opera por plataformas tipo Uber Eats y aliados de ultima milla.',
    },
  ];

  constructor() {
    // La UI no conoce si los datos vienen de API, XML o fallback: esa frontera pertenece al servicio.
    this.productService.getAll().subscribe({
      next: (items) => {
        this.menuItems.set(items);
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar el menu gourmet en este momento.');
        this.menuItems.set([]);
      },
    });
  }

  ngOnDestroy(): void {
    // Al destruir el componente limpiamos timers para evitar efectos tardios sobre una vista inexistente.
    this.clearOrderTimers();
  }

  handleEscape(): void {
    if (this.selectedItem()) {
      this.closeDetail();
      return;
    }

    if (this.checkoutOpen()) {
      this.closeCheckout();
    }
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  toggleAvailabilityFilter(): void {
    this.onlyAvailable.update((value) => !value);
  }

  updateSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  agregarAlCarrito(item: MenuItem): void {
    // El componente delega la regla del carrito al servicio; aqui solo responde a eventos de UI.
    this.carritoService.agregar(item);
  }

  toggleFavorito(item: MenuItem): void {
    this.favoriteIds.update((ids) => {
      if (ids.includes(item.id)) {
        const next = ids.filter((id) => id !== item.id);
        this.persistFavoriteIds(next);
        return next;
      }

      const next = [...ids, item.id];
      this.persistFavoriteIds(next);
      return next;
    });
  }

  isFavorite(id: number): boolean {
    return this.favoriteSet().has(id);
  }

  openDetail(item: MenuItem): void {
    this.selectedItem.set(item);
  }

  closeDetail(): void {
    this.selectedItem.set(null);
  }

  incrementar(line: CartLine): void {
    this.carritoService.incrementar(line.item.id);
  }

  decrementar(line: CartLine): void {
    this.carritoService.decrementar(line.item.id);
  }

  eliminar(line: CartLine): void {
    this.carritoService.eliminar(line.item.id);
  }

  vaciarCarrito(): void {
    this.carritoService.vaciar();
  }

  openCheckout(): void {
    // No tiene sentido abrir checkout sin productos; es una validacion de flujo, no de formulario.
    if (this.cartLines().length === 0) {
      return;
    }

    this.checkoutError.set('');
    this.checkoutOpen.set(true);
    this.checkoutStep.set(1);
  }

  closeCheckout(): void {
    this.checkoutOpen.set(false);
    this.checkoutStep.set(1);
    this.paypalButtonsRendered = false;
    this.paypalMessage.set('');
    this.checkoutError.set('');
  }

  previousCheckoutStep(): void {
    const step = this.checkoutStep();

    if (step > 1) {
      this.checkoutStep.set((step - 1) as CheckoutStep);
      this.paypalButtonsRendered = false;
      this.paypalMessage.set('');
      this.checkoutError.set('');
    }
  }

  nextCheckoutStep(): void {
    const step = this.checkoutStep();

    if (step === 1) {
      if (!this.validateStepOne()) {
        this.checkoutError.set(
          'Completa los datos de entrega correctamente. El teléfono debe tener 10 dígitos y la dirección al menos 8 caracteres.'
        );
        return;
      }
    }

    if (step === 2) {
      if (!this.validateStepTwo()) {
        this.checkoutError.set(
          this.checkoutForm.controls.paymentMethod.value === 'Tarjeta'
            ? 'Introduce los últimos 4 dígitos válidos de la tarjeta.'
            : 'Selecciona un método de pago válido.'
        );
        return;
      }
    }

    this.checkoutError.set('');

    if (step < 3) {
      this.checkoutStep.set((step + 1) as CheckoutStep);

      if (step === 2 && this.checkoutForm.controls.paymentMethod.value === 'PayPal') {
        window.setTimeout(() => void this.renderPayPalButtons(), 0);
      }
    }
  }

  confirmOrder(): void {
    if (!this.validateStepOne() || !this.validateStepTwo() || this.cartLines().length === 0) {
      this.checkoutError.set('Completa toda la información necesaria antes de confirmar el pedido.');
      return;
    }
    this.checkoutError.set('');

    const orderCode = this.buildOrderCode();
    const purchasedLines = this.cartLines().map((line) => ({
      ...line,
      item: { ...line.item },
    }));

    this.orderCode.set(orderCode);
    this.orderStatus.set('recibido');
    this.checkoutStep.set(3);
    this.scheduleOrderProgress();
    this.carritoService.exportarTicketXMLConOpciones({
      folio: orderCode,
      paymentMethod: this.checkoutForm.controls.paymentMethod.value,
      customerName: this.checkoutForm.controls.customerName.value,
      lines: purchasedLines,
    });
    this.carritoService.vaciar();
  }

  descargarTicket(): void {
    if (this.cartLines().length === 0) {
      return;
    }

    this.carritoService.exportarTicketXML();
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  private validateStepOne(): boolean {
    // Paso 1: datos logisticos minimos para poder entregar el pedido.
    const controls = [
      this.checkoutForm.controls.customerName,
      this.checkoutForm.controls.phone,
      this.checkoutForm.controls.address,
      this.checkoutForm.controls.deliveryTime,
    ];

    controls.forEach((control) => {
      control.markAsTouched();
      control.updateValueAndValidity();
    });

    const phoneControl = this.checkoutForm.controls.phone;
    const sanitizedPhone = this.sanitizePhone(phoneControl.value);
    const isPhoneValid = sanitizedPhone.length === 10;
    phoneControl.setErrors(isPhoneValid ? null : { phoneInvalid: true });

    return controls.every((control) => control.valid) && isPhoneValid;
  }

  private sanitizePhone(value: string): string {
    return value.replace(/\D/g, '');
  }

  private validateStepTwo(): boolean {
    // Paso 2: valida la forma de pago.
    // Tarjeta necesita ultimos 4 digitos; PayPal NO, porque la aprobacion ocurre en su ventana oficial.
    const paymentControl = this.checkoutForm.controls.paymentMethod;
    const cardControl = this.checkoutForm.controls.cardLast4;

    paymentControl.markAsTouched();
    paymentControl.updateValueAndValidity();

    if (paymentControl.value === 'Tarjeta') {
      cardControl.markAsTouched();
      const isValidLast4 = /^[0-9]{4}$/.test(cardControl.value);

      cardControl.setErrors(isValidLast4 ? null : { cardLast4Invalid: true });
      return paymentControl.valid && isValidLast4;
    }

    if (paymentControl.value === 'PayPal') {
      cardControl.setErrors(null);
      return paymentControl.valid;
    }

    cardControl.setErrors(null);
    return paymentControl.valid;
  }

  private async renderPayPalButtons(): Promise<void> {
    // Guardia 1: no renderizar dos veces el mismo boton.
    // Guardia 2: si ya hay folio, la compra termino y no debe existir otro intento de pago.
    if (this.paypalButtonsRendered || this.orderCode()) {
      return;
    }

    // El contenedor existe solo en el paso 3 y solo si el metodo elegido es PayPal.
    const container = document.querySelector('#paypal-button-container');

    if (!container) {
      return;
    }

    if (paypalConfig.clientId === 'TU_CLIENT_ID_SANDBOX_AQUI') {
      this.paypalMessage.set(
        'Falta configurar el Client ID de PayPal en src/environments/paypal.config.ts.'
      );
      return;
    }

    this.paypalMessage.set('Cargando PayPal...');

    try {
      // Primero cargamos el script oficial. Si falla, no hay boton que renderizar.
      await this.loadPayPalSdk();
      container.innerHTML = '';

      // Aqui conectamos nuestro flujo Angular/Express con el ciclo de vida del boton PayPal.
      const buttons = window.paypal?.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
        },
        createOrder: async () => {
          try {
            // PayPal llama createOrder cuando el usuario presiona el boton.
            // Nosotros pedimos al backend crear la orden para mantener credenciales secretas fuera del navegador.
            const response = await fetch(`${this.paypalApiUrl}/orders`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: this.cartTotal(),
                currency: paypalConfig.currency,
              }),
            });
            const order = await response.json();

            if (!response.ok || !order.id) {
              const message = this.getPayPalErrorMessage(order);
              this.paypalMessage.set(`No se pudo crear la orden de PayPal: ${message}`);
              throw new Error(message);
            }

            return order.id;
          } catch (error) {
            // Si no se crea la orden, PayPal cierra/interrumpe el flujo porque no tiene nada que aprobar.
            const message = this.getPayPalErrorMessage(error);
            this.paypalMessage.set(
              `PayPal cerro la ventana porque no pudo crear la orden: ${message}`
            );
            throw error;
          }
        },
        onApprove: async (data) => {
          // onApprove significa: el comprador autorizo en PayPal.
          // Todavia falta capturar; aprobar NO siempre equivale a cobrar.
          this.paypalMessage.set('Pago aprobado. Capturando transaccion...');

          try {
            // La captura se hace en backend porque requiere comunicarse con PayPal usando access token.
            const response = await fetch(`${this.paypalApiUrl}/orders/${data.orderID}/capture`, {
              method: 'POST',
            });
            const capture = await response.json();

            if (!response.ok) {
              const message = this.getPayPalErrorMessage(capture);
              this.paypalMessage.set(`No se pudo capturar el pago de PayPal: ${message}`);
              throw new Error(message);
            }

            this.paypalMessage.set('Pago capturado. Generando ticket...');
            // Reutilizamos el flujo normal de pedido: genera folio, XML, tracking y vacia carrito.
            this.confirmOrder();
          } catch (error) {
            const message = this.getPayPalErrorMessage(error);
            this.paypalMessage.set(`PayPal aprobo, pero fallo la captura: ${message}`);
            throw error;
          }
        },
        onCancel: () => {
          this.paypalMessage.set('Pago cancelado. Tu carrito sigue intacto.');
        },
        onError: (error) => {
          console.error('PayPal error', error);
          this.paypalMessage.set(
            `PayPal no pudo procesar el pago: ${this.getPayPalErrorMessage(error)}`
          );
        },
      });

      if (!buttons) {
        this.paypalMessage.set('El SDK cargo, pero PayPal Buttons no esta disponible.');
        return;
      }

      await buttons.render('#paypal-button-container');

      this.paypalButtonsRendered = true;
      this.paypalMessage.set('Inicia sesion con PayPal para aprobar el pago.');
    } catch (error) {
      console.error('PayPal SDK load/render error', error);
      this.paypalMessage.set('No fue posible cargar el SDK de PayPal.');
    }
  }

  private loadPayPalSdk(): Promise<void> {
    // Si el script ya cargo en esta sesion, no lo insertamos otra vez.
    if (window.paypal) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk]');

      // Evita carreras: si dos renderizados intentan cargar PayPal, ambos esperan el mismo script.
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(), { once: true });
        return;
      }

      const script = document.createElement('script');

      // Estos query params configuran el SDK antes de descargarlo.
      // Un valor invalido aqui rompe la carga completa del script; por eso el locale debe ser `es_MX`.
      const params = new URLSearchParams({
        'client-id': paypalConfig.clientId,
        currency: paypalConfig.currency,
        intent: 'capture',
        components: 'buttons',
        locale: paypalConfig.locale,
        'buyer-country': paypalConfig.buyerCountry,
      });

      script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
      script.async = true;
      script.dataset['paypalSdk'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.append(script);
    });
  }

  private getPayPalErrorMessage(error: unknown): string {
    // Normaliza errores de varios origenes:
    // - Error nativo de JS
    // - string directo
    // - respuesta JSON del backend
    // - respuesta JSON anidada de PayPal con details[]
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      const candidate = error as {
        error?: string;
        message?: string;
        name?: string;
        paypal?: {
          error?: string;
          message?: string;
          name?: string;
          details?: Array<{ issue?: string; description?: string }>;
        };
        details?: Array<{ issue?: string; description?: string }>;
      };

      if (candidate.paypal) {
        const paypalMessage = this.getPayPalErrorMessage(candidate.paypal);
        return candidate.error ? `${candidate.error}: ${paypalMessage}` : paypalMessage;
      }

      if (candidate.details?.length) {
        return candidate.details
          .map((detail) => detail.description ?? detail.issue)
          .filter(Boolean)
          .join(' | ');
      }

      return candidate.error ?? candidate.message ?? candidate.name ?? JSON.stringify(candidate);
    }

    return 'Error desconocido';
  }

  private scheduleOrderProgress(): void {
    // Simulamos tracking del restaurante; cada timer representa un cambio de estado operativo.
    this.clearOrderTimers();

    this.orderTimers.push(
      window.setTimeout(() => this.orderStatus.set('preparando'), 3000),
      window.setTimeout(() => this.orderStatus.set('en-camino'), 7000),
      window.setTimeout(() => this.orderStatus.set('entregado'), 12000)
    );
  }

  private clearOrderTimers(): void {
    for (const timer of this.orderTimers) {
      clearTimeout(timer);
    }

    this.orderTimers.length = 0;
  }

  private buildOrderCode(): string {
    // Folio legible para el usuario; no es criptograficamente unico, solo identificador de demo.
    const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `CQ-${seed}`;
  }

  private readFavoriteIds(): number[] {
    try {
      const raw = localStorage.getItem(this.favoritesStorageKey);

      if (!raw) {
        return [];
      }

      const parsed: unknown = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
    } catch {
      return [];
    }
  }

  private persistFavoriteIds(ids: number[]): void {
    try {
      localStorage.setItem(this.favoritesStorageKey, JSON.stringify(ids));
    } catch {
      // Ignored: favorites persistence is best-effort only.
    }
  }
}

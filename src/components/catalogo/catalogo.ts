import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MenuItem } from '../../models/producto.model';
import { AuthService } from '../../services/auth.service';
import { CartLine, CarritoService } from '../../services/carrito.service';
import { ProductService } from '../../services/producto.service';
import { paypalConfig } from '../../environments/paypal.config';
import { ProductoCard } from '../producto-card/producto-card';

// [BUSCAR: CATALOGO] Estas interfaces documentan la informacion estatica de la landing.
// [BUSCAR: ANGULAR] En una app real podrian venir de CMS, pero aqui mantenerlas tipadas ayuda a estudiar Angular.
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
  imports: [ProductoCard, ReactiveFormsModule, CurrencyPipe, RouterLink],
  host: {
    '(document:keydown.escape)': 'handleEscape()',
  },
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnDestroy {
  // [BUSCAR: CATALOGO] Clave versionada: si cambia la forma de guardar favoritos, se puede migrar sin romper datos viejos.
  private readonly favoritesStorageKey = 'casa-quetzal-favorites-v1';
  private readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly carritoService = inject(CarritoService);
  private readonly paypalApiUrl = 'http://localhost:3000/api/paypal';
  private readonly receiptApiUrl = 'http://localhost:3000/api/paypal/receipt';
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
  readonly receiptMessage = signal('');
  readonly cartLines = this.carritoService.lineas;
  readonly adminProductMessage = signal('');
  readonly adminProductError = signal('');
  readonly adminProductFormOpen = signal(false);
  readonly editingProduct = signal<MenuItem | null>(null);

  // [BUSCAR: CHECKOUT FORMULARIO] Reactive Forms centraliza validacion y estado del checkout.
  // [BUSCAR: PAYPAL] PayPal se renderiza con el SDK oficial en el paso final, cuando ya conocemos total y cliente.
  // [BUSCAR: PAYPAL PEDIDO API ANGULAR] La orden se crea y captura en backend para NO exponer el Client Secret en Angular.
  readonly adminProductForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    imageUrl: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    inStock: new FormControl(true, { nonNullable: true }),
    pairing: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    season: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly checkoutForm = new FormGroup({
    customerName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    customerEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
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

  // [BUSCAR: CATALOGO] computed recalcula derivaciones cuando cambian los signals de los que depende.
  readonly favoriteSet = computed(() => new Set(this.favoriteIds()));
  readonly isAuthenticated = computed(() => this.authService.token() !== '');
  readonly isAdmin = computed(() => this.authService.role() === 'admin');
  readonly canBuy = computed(() => this.isAuthenticated() && !this.isAdmin());
  readonly purchaseBlockedText = computed(() =>
    this.isAdmin() ? 'Modo administrador' : 'Inicia sesion para comprar'
  );
  readonly favoriteItems = computed(() => {
    const favoriteIds = this.favoriteSet();
    return this.menuItems().filter((item) => favoriteIds.has(item.id));
  });

  readonly availableCount = computed(() =>
    this.menuItems().filter((dish) => dish.inStock).length
  );

  readonly cartItemsCount = computed(() => this.carritoService.totalItems());
  readonly cartSubtotal = computed(() => this.carritoService.subtotal());
  readonly cartIva = computed(() => this.carritoService.iva());
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
        'Mostramos precios base en MXN y calculamos IVA en el carrito antes del pago.',
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
    // [BUSCAR: TICKET API INTERFAZ ERRORES] La UI no conoce si los datos vienen de API, XML o fallback: esa frontera pertenece al servicio.
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
    // [BUSCAR: ANGULAR INTERFAZ RENDIMIENTO] Al destruir el componente limpiamos timers para evitar efectos tardios sobre una vista inexistente.
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

  logout(): void {
    this.authService.logout();
  }

  toggleAvailabilityFilter(): void {
    this.onlyAvailable.update((value) => !value);
  }

  updateSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  agregarAlCarrito(item: MenuItem): void {
    if (!this.canBuy()) {
      return;
    }

    // [BUSCAR: CARRITO ANGULAR INTERFAZ] El componente delega la regla del carrito al servicio; aqui solo responde a eventos de UI.
    this.carritoService.agregar(item);
  }

  editarProducto(item: MenuItem): void {
    this.adminProductMessage.set('');
    this.adminProductError.set('');
    this.adminProductFormOpen.set(true);
    this.editingProduct.set(item);
    this.adminProductForm.setValue({
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl ?? '',
      category: item.category,
      description: item.description,
      inStock: item.inStock,
      pairing: item.pairing,
      season: item.season,
    });
  }

  nuevoProducto(): void {
    this.adminProductMessage.set('');
    this.adminProductError.set('');
    this.editingProduct.set(null);
    this.adminProductFormOpen.set(true);
    this.adminProductForm.reset({
      name: '',
      price: 1,
      imageUrl: '',
      category: '',
      description: '',
      inStock: true,
      pairing: '',
      season: '',
    });
  }

  cancelarEdicionProducto(): void {
    this.editingProduct.set(null);
    this.adminProductFormOpen.set(false);
    this.adminProductForm.reset({
      name: '',
      price: 1,
      imageUrl: '',
      category: '',
      description: '',
      inStock: true,
      pairing: '',
      season: '',
    });
    this.adminProductError.set('');
  }

  guardarProductoAdmin(): void {
    const editingProduct = this.editingProduct();

    if (!this.adminProductFormOpen() || this.adminProductForm.invalid) {
      this.adminProductError.set('Completa todos los datos obligatorios del producto.');
      return;
    }

    const productPayload: Omit<MenuItem, 'id'> = {
      name: this.adminProductForm.controls.name.value,
      price: this.adminProductForm.controls.price.value,
      imageUrl: this.adminProductForm.controls.imageUrl.value,
      category: this.adminProductForm.controls.category.value,
      description: this.adminProductForm.controls.description.value,
      inStock: this.adminProductForm.controls.inStock.value,
      pairing: this.adminProductForm.controls.pairing.value,
      season: this.adminProductForm.controls.season.value,
    };

    this.adminProductError.set('');
    this.adminProductMessage.set('');

    if (!editingProduct) {
      this.productService.create(productPayload).subscribe({
        next: (createdProduct) => {
          this.menuItems.update((items) => [...items, createdProduct]);
          this.adminProductMessage.set('Producto agregado correctamente.');
          this.cancelarEdicionProducto();
        },
        error: (error) => {
          this.adminProductError.set(error.error?.error || 'No fue posible agregar el producto.');
        },
      });
      return;
    }

    this.productService.update({ ...productPayload, id: editingProduct.id }).subscribe({
      next: (savedProduct) => {
        this.menuItems.update((items) =>
          items.map((item) => (item.id === savedProduct.id ? savedProduct : item))
        );
        this.adminProductMessage.set('Producto actualizado correctamente.');
        this.cancelarEdicionProducto();
      },
      error: (error) => {
        this.adminProductError.set(error.error?.error || 'No fue posible actualizar el producto.');
      },
    });
  }

  eliminarProducto(item: MenuItem): void {
    if (!confirm(`Â¿Eliminar "${item.name}" del menu? Esta accion no se puede deshacer.`)) {
      return;
    }

    this.adminProductError.set('');
    this.adminProductMessage.set('');

    this.productService.delete(item.id).subscribe({
      next: () => {
        this.menuItems.update((items) => items.filter((product) => product.id !== item.id));
        this.favoriteIds.update((ids) => {
          const next = ids.filter((id) => id !== item.id);
          this.persistFavoriteIds(next);
          return next;
        });
        this.adminProductMessage.set('Producto eliminado correctamente.');
        if (this.editingProduct()?.id === item.id) {
          this.cancelarEdicionProducto();
        }
      },
      error: (error) => {
        this.adminProductError.set(error.error?.error || 'No fue posible eliminar el producto.');
      },
    });
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
    // [BUSCAR: CHECKOUT FORMULARIO] No tiene sentido abrir checkout sin productos; es una validacion de flujo, no de formulario.
    if (!this.canBuy() || this.cartLines().length === 0) {
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
          'Completa los datos de entrega correctamente. El telÃ©fono debe tener 10 dÃ­gitos y la direcciÃ³n al menos 8 caracteres.'
        );
        return;
      }
    }

    if (step === 2) {
      if (!this.validateStepTwo()) {
        this.checkoutError.set(
          this.checkoutForm.controls.paymentMethod.value === 'Tarjeta'
            ? 'Introduce los Ãºltimos 4 dÃ­gitos vÃ¡lidos de la tarjeta.'
            : 'Selecciona un mÃ©todo de pago vÃ¡lido.'
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

  async confirmOrder(): Promise<void> {
    if (!this.validateStepOne() || !this.validateStepTwo() || this.cartLines().length === 0) {
      this.checkoutError.set('Completa toda la informacion necesaria antes de confirmar el pedido.');
      return;
    }

    this.checkoutError.set('');
    this.receiptMessage.set('Enviando ticket al correo...');

    const orderCode = this.buildOrderCode();
    const purchasedLines = this.buildPurchasedLines();

    try {
      await this.sendReceiptEmail(orderCode, purchasedLines);
      this.finalizeOrder(orderCode, purchasedLines, 'Ticket XML y PDF enviado al correo.');
    } catch (error) {
      this.receiptMessage.set('');
      this.checkoutError.set(
        `No se pudo enviar el ticket por correo: ${this.getPayPalErrorMessage(error)}`
      );
    }
  }

  private buildPurchasedLines(): CartLine[] {
    return this.cartLines().map((line) => ({
      ...line,
      item: { ...line.item },
    }));
  }

  // [BUSCAR: TICKET PAGO API] Payload del recibo enviado al backend para generar XML y PDF con cliente, pago, impuestos y productos.
  private buildReceiptPayload(orderCode: string, purchasedLines: CartLine[], paymentMethod: PaymentMethod) {
    return {
      folio: orderCode,
      customerName: this.checkoutForm.controls.customerName.value,
      customerEmail: this.checkoutForm.controls.customerEmail.value,
      paymentMethod,
      taxRate: this.carritoService.ivaRate,
      lines: purchasedLines,
    };
  }

  private async readBackendResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();

    if (contentType.includes('application/json')) {
      return body ? JSON.parse(body) : {};
    }

    const preview = body.trim().slice(0, 80) || 'respuesta vacia';
    throw new Error(
      `El backend no devolvio JSON. Revisa que Express este corriendo y que la ruta exista. Respuesta: ${preview}`
    );
  }

  private async sendReceiptEmail(orderCode: string, purchasedLines: CartLine[]): Promise<void> {
    const response = await fetch(`${this.receiptApiUrl}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        this.buildReceiptPayload(orderCode, purchasedLines, this.checkoutForm.controls.paymentMethod.value)
      ),
    });

    const result = await this.readBackendResponse(response);

    if (!response.ok) {
      throw new Error(result.error || 'Error al enviar el ticket');
    }
  }

  private finalizeOrder(orderCode: string, purchasedLines: CartLine[], message: string): void {
    this.orderCode.set(orderCode);
    this.orderStatus.set('recibido');
    this.checkoutStep.set(3);
    this.receiptMessage.set(message);
    this.scheduleOrderProgress();
    this.carritoService.vaciar();
  }

  formatPrice(value: number): string {
    return this.currencyFormatter.format(value);
  }

  private validateStepOne(): boolean {
    // [BUSCAR: PEDIDO] Paso 1: datos logisticos minimos para poder entregar el pedido.
    const controls = [
      this.checkoutForm.controls.customerName,
      this.checkoutForm.controls.customerEmail,
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
    // [BUSCAR: PAGO] Paso 2: valida la forma de pago.
    // [BUSCAR: PAYPAL PAGO INTERFAZ] Tarjeta necesita ultimos 4 digitos; PayPal NO, porque la aprobacion ocurre en su ventana oficial.
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
    // [BUSCAR: INTERFAZ] Guardia 1: no renderizar dos veces el mismo boton.
    // [BUSCAR: CARRITO PAGO PEDIDO] Guardia 2: si ya hay folio, la compra termino y no debe existir otro intento de pago.
    if (this.paypalButtonsRendered || this.orderCode()) {
      return;
    }

    // [BUSCAR: PAYPAL] El contenedor existe solo en el paso 3 y solo si el metodo elegido es PayPal.
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
      // [BUSCAR: INTERFAZ ERRORES] Primero cargamos el script oficial. Si falla, no hay boton que renderizar.
      await this.loadPayPalSdk();
      container.innerHTML = '';

      // [BUSCAR: PAYPAL API ANGULAR INTERFAZ] Aqui conectamos nuestro flujo Angular/Express con el ciclo de vida del boton PayPal.
      const buttons = window.paypal?.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
        },
        createOrder: async () => {
          try {
            // [BUSCAR: PAYPAL USUARIO INTERFAZ] PayPal llama createOrder cuando el usuario presiona el boton.
            // [BUSCAR: AUTENTICACION PEDIDO API] Nosotros pedimos al backend crear la orden para mantener credenciales secretas fuera del navegador.
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
            const order = await this.readBackendResponse(response);

            if (!response.ok || !order.id) {
              const message = this.getPayPalErrorMessage(order);
              this.paypalMessage.set(`No se pudo crear la orden de PayPal: ${message}`);
              throw new Error(message);
            }

            return order.id;
          } catch (error) {
            // [BUSCAR: PAYPAL PEDIDO] Si no se crea la orden, PayPal cierra/interrumpe el flujo porque no tiene nada que aprobar.
            const message = this.getPayPalErrorMessage(error);
            this.paypalMessage.set(
              `PayPal cerro la ventana porque no pudo crear la orden: ${message}`
            );
            throw error;
          }
        },
        onApprove: async (data) => {
          // [BUSCAR: PAYPAL] onApprove significa: el comprador autorizo en PayPal.
          // [BUSCAR: CATALOGO] Todavia falta capturar; aprobar NO siempre equivale a cobrar.
          this.paypalMessage.set('Pago aprobado. Capturando transaccion...');

          try {
            // [BUSCAR: PAYPAL AUTENTICACION API] La captura se hace en backend porque requiere comunicarse con PayPal usando access token.
            const orderCode = this.buildOrderCode();
            const purchasedLines = this.buildPurchasedLines();
            const response = await fetch(`${this.paypalApiUrl}/orders/${data.orderID}/capture`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                receipt: this.buildReceiptPayload(orderCode, purchasedLines, 'PayPal'),
              }),
            });
            const capture = await this.readBackendResponse(response);

            if (!response.ok) {
              const message = this.getPayPalErrorMessage(capture);
              this.paypalMessage.set(`No se pudo capturar el pago de PayPal: ${message}`);
              throw new Error(message);
            }

            if (capture.receiptError) {
              this.paypalMessage.set(`Pago capturado, pero fallo el envio del ticket: ${capture.receiptError}`);
              this.finalizeOrder(orderCode, purchasedLines, 'Pago capturado. Ticket pendiente de envio.');
              return;
            }

            this.paypalMessage.set('Pago capturado. Ticket enviado al correo.');
            this.finalizeOrder(orderCode, purchasedLines, 'Ticket XML y PDF enviado al correo.');
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
    // [BUSCAR: AUTENTICACION] Si el script ya cargo en esta sesion, no lo insertamos otra vez.
    if (window.paypal) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk]');

      // [BUSCAR: PAYPAL RENDIMIENTO] Evita carreras: si dos renderizados intentan cargar PayPal, ambos esperan el mismo script.
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(), { once: true });
        return;
      }

      const script = document.createElement('script');

      // [BUSCAR: PAYPAL] Estos query params configuran el SDK antes de descargarlo.
      // [BUSCAR: CATALOGO] Un valor invalido aqui rompe la carga completa del script; por eso el locale debe ser `es_MX`.
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
    // [BUSCAR: ERRORES] Normaliza errores de varios origenes:
    // [BUSCAR: ERRORES] - Error nativo de JS
    // [BUSCAR: CATALOGO] - string directo
    // [BUSCAR: API] - respuesta JSON del backend
    // [BUSCAR: PAYPAL] - respuesta JSON anidada de PayPal con details[]
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
    // [BUSCAR: PEDIDO RENDIMIENTO] Simulamos tracking del restaurante; cada timer representa un cambio de estado operativo.
    this.clearOrderTimers();

    this.orderTimers.push(
      window.setTimeout(() => this.orderStatus.set('preparando'), 3000),
      window.setTimeout(() => this.orderStatus.set('en-camino'), 7000),
      window.setTimeout(() => this.orderStatus.set('entregado'), 12000)
    );
  }

  private clearOrderTimers(): void {
    // [BUSCAR: PEDIDO] Cancela cualquier simulacion de tracking pendiente antes de desmontar o reiniciar el pedido.
    for (const timer of this.orderTimers) {
      clearTimeout(timer);
    }

    this.orderTimers.length = 0;
  }

  private buildOrderCode(): string {
    // [BUSCAR: USUARIO PEDIDO] Folio legible para el usuario; no es criptograficamente unico, solo identificador de demo.
    const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `CQ-${seed}`;
  }

  private readFavoriteIds(): number[] {
    // [BUSCAR: ERRORES RENDIMIENTO] Recupera favoritos persistidos, pero ignora cualquier dato corrupto o incoherente.
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
    // [BUSCAR: INTERFAZ ERRORES RENDIMIENTO] La persistencia de favoritos es secundaria; si falla, la UI sigue funcionando.
    try {
      localStorage.setItem(this.favoritesStorageKey, JSON.stringify(ids));
    } catch {
      // [BUSCAR: RENDIMIENTO] Ignored: favorites persistence is best-effort only.
    }
  }
}

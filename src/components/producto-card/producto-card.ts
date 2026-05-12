import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MenuItem } from '../../models/producto.model';

// Componente presentacional: solo recibe datos y emite eventos.
// NO modifica carrito ni favoritos directamente; eso lo hace el componente padre.
@Component({
  selector: 'app-producto-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.css',
})
export class ProductoCard {
  // input.required obliga a que el padre siempre envie un producto.
  readonly item = input.required<MenuItem>();
  // Indica si esta tarjeta debe mostrarse marcada como favorita.
  readonly isFavorite = input(false);
  // output comunica intenciones al padre: agregar, favorito o ver detalle.
  readonly add = output<MenuItem>();
  readonly toggleFavorite = output<MenuItem>();
  readonly view = output<MenuItem>();

  // Texto derivado del estado del producto.
  // computed evita guardar duplicado el mismo dato.
  readonly availabilityText = computed(() =>
    this.item().inStock ? 'Disponible para envio' : 'Agotada temporalmente'
  );

  onAdd(): void {
    // Regla de interfaz: no permitimos agregar productos agotados.
    if (!this.item().inStock) {
      return;
    }

    // Emitimos el producto; el padre decide que servicio usar.
    this.add.emit(this.item());
  }

  onToggleFavorite(): void {
    // La tarjeta no sabe como se persisten favoritos; solo avisa el click.
    this.toggleFavorite.emit(this.item());
  }

  onView(): void {
    // Abre modal/detalle en el componente padre.
    this.view.emit(this.item());
  }
}

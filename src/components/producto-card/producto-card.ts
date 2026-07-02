import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MenuItem } from '../../models/producto.model';

@Component({
  selector: 'app-producto-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  templateUrl: './producto-card.html',
  styleUrl: './producto-card.css',
})
export class ProductoCard {
  readonly item = input.required<MenuItem>();
  readonly isFavorite = input(false);
  readonly canBuy = input(true);
  readonly blockedActionText = input('Modo administrador');
  readonly add = output<MenuItem>();
  readonly toggleFavorite = output<MenuItem>();
  readonly view = output<MenuItem>();

  // [BUSCAR: PRODUCTO] Traduce el estado de inventario a un texto amigable para la interfaz.
  readonly availabilityText = computed(() =>
    this.item().inStock ? 'Disponible para envio' : 'Agotada temporalmente'
  );

  // [BUSCAR: PRODUCTO] Emite el evento de agregar solo si el platillo sigue disponible.
  onAdd(): void {
    if (!this.canBuy() || !this.item().inStock) {
      return;
    }

    this.add.emit(this.item());
  }

  // [BUSCAR: FAVORITOS ANGULAR] Alterna el estado de favorito desde el componente padre.
  onToggleFavorite(): void {
    this.toggleFavorite.emit(this.item());
  }

  // [BUSCAR: PRODUCTO] Notifica al padre que quiere abrirse el detalle del platillo.
  onView(): void {
    this.view.emit(this.item());
  }
}

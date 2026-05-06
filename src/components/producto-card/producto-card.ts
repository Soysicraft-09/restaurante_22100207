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
  readonly add = output<MenuItem>();
  readonly toggleFavorite = output<MenuItem>();
  readonly view = output<MenuItem>();

  readonly availabilityText = computed(() =>
    this.item().inStock ? 'Disponible para envio' : 'Agotada temporalmente'
  );

  onAdd(): void {
    if (!this.item().inStock) {
      return;
    }

    this.add.emit(this.item());
  }

  onToggleFavorite(): void {
    this.toggleFavorite.emit(this.item());
  }

  onView(): void {
    this.view.emit(this.item());
  }
}

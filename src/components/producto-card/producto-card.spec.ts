import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoCard } from './producto-card';
import { MenuItem } from '../../models/producto.model';

// [BUSCAR: PAGO ANGULAR FORMULARIO INTERFAZ] Verifica que la tarjeta soporte un MenuItem valido via input signal.
describe('ProductoCard', () => {
  let component: ProductoCard;
  let fixture: ComponentFixture<ProductoCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // [BUSCAR: PAGO FORMULARIO INTERFAZ PRUEBAS] La tarjeta se prueba sola porque recibe todo por input.
      imports: [ProductoCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductoCard);
    component = fixture.componentInstance;

    const dishMock: MenuItem = {
      id: 1,
      name: 'Platillo de prueba',
      price: 100,
      imageUrl: '/img/test.jpg',
      category: 'Entradas',
      description: 'Descripcion test',
      inStock: true,
      pairing: 'Maridaje test',
      season: 'Temporada test',
    };

    // [BUSCAR: ANGULAR FORMULARIO PRUEBAS] setInput es la forma correcta de alimentar un input signal en pruebas.
    fixture.componentRef.setInput('item', dishMock);
    await fixture.whenStable();
  });

  it('should create', () => {
    // [BUSCAR: PAGO PRODUCTO INTERFAZ] Valida que la tarjeta se pueda montar con un producto valido.
    expect(component).toBeTruthy();
  });
});

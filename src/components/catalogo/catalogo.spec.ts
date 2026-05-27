import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Catalogo } from './catalogo';
import { ProductService } from '../../services/producto.service';

// Verifica que Catalogo se pueda instanciar con dependencias simuladas.
describe('Catalogo', () => {
  let component: Catalogo;
  let fixture: ComponentFixture<Catalogo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Pruebo el componente real, no una version simplificada.
      imports: [Catalogo],
      providers: [
        {
          provide: ProductService,
          useValue: { getAll: () => of([]) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Catalogo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    // Si esto pasa, el catalogo puede construirse sin errores.
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Catalogo } from './catalogo';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/producto.service';

// [BUSCAR: PRODUCTO PRUEBAS] Verifica que Catalogo se pueda instanciar con dependencias simuladas.
describe('Catalogo', () => {
  let component: Catalogo;
  let fixture: ComponentFixture<Catalogo>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // [BUSCAR: ANGULAR] Pruebo el componente real, no una version simplificada.
      imports: [Catalogo],
      providers: [
        provideRouter([]),
        {
          provide: ProductService,
          useValue: { getAll: () => of([]) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Catalogo);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    authService.token.set('');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    // [BUSCAR: PRODUCTO ERRORES] Si esto pasa, el catalogo puede construirse sin errores.
    expect(component).toBeTruthy();
  });

  it('no muestra la insignia Admin sin una sesion iniciada', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Admin');
  });

  it('muestra la insignia Admin cuando el token pertenece a un administrador', () => {
    const payload = btoa(JSON.stringify({ role: 'admin' }));
    authService.token.set(`header.${payload}.signature`);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Admin');
  });
});

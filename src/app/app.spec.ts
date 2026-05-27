import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';

// Suite minima del componente raiz: construccion y presencia del router-outlet.
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Importo el componente raiz tal como se usaria en la app real.
      imports: [App],
      // El router vacio es suficiente para estas pruebas basicas.
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});

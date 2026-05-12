import { Routes } from '@angular/router';

// Tabla de rutas de Angular.
// Como esta app solo tiene una pantalla principal, la ruta vacia carga el Catalogo.
export const routes: Routes = [
  {
    path: '',
    // Lazy loading: Angular descarga el componente solo cuando la ruta se visita.
    loadComponent: () => import('../components/catalogo/catalogo').then((module) => module.Catalogo),
  },
  // Cualquier ruta desconocida regresa al catalogo para evitar pantalla en blanco.
  { path: '**', redirectTo: '' },
];

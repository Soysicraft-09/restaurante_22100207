import { Routes } from '@angular/router';

// hace que cargue el catalogo al entrar a la app
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../components/catalogo/catalogo').then((module) => module.Catalogo),
  },
  { path: '**', redirectTo: '' },
];

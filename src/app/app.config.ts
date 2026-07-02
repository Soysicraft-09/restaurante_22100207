import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

// [BUSCAR: USUARIO ANGULAR] Registro central de providers globales de Angular para toda la aplicacion.
export const appConfig: ApplicationConfig = {
  providers: [
    // [BUSCAR: ANGULAR ERRORES] Esto hace que errores globales del navegador pasen por Angular.
    provideBrowserGlobalErrorListeners(),
    // [BUSCAR: API] Habilita HttpClient para consumir el backend (por ejemplo /api/productos).
    provideHttpClient(),
    // [BUSCAR: CONFIGURACION] Aqui se conectan las rutas declaradas en app.routes.ts.
    provideRouter(routes)
  ]
};

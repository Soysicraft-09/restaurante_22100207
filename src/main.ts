import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// [BUSCAR: ANGULAR] Inicia Angular en el navegador usando App como raiz de renderizado.
bootstrapApplication(App, appConfig)
  // [BUSCAR: ERRORES] Si algo falla al iniciar, lo mando a consola para detectarlo rapido.
  .catch((err) => console.error(err));

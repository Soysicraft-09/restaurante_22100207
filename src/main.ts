// Punto de entrada de la app: arranca el componente raiz con su configuracion global.
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Inicia Angular en el navegador usando App como raiz de renderizado.
bootstrapApplication(App, appConfig)
  // Si algo falla al iniciar, lo mando a consola para detectarlo rapido.
  .catch((err) => console.error(err));

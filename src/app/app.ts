import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raiz: no contiene negocio, solo sirve de host para las rutas.
@Component({
  // Este selector es la etiqueta que Angular busca dentro de index.html.
  selector: 'app-root',
  // RouterOutlet es lo que permite que cambie la vista segun la ruta activa.
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Este titulo no se usa de momento en la interfaz, pero sirve como dato base del proyecto.
  protected readonly title = signal('mi-proyecto');
}

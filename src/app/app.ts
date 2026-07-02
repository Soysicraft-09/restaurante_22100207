import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // [BUSCAR: ANGULAR INTERFAZ] Titulo base de la aplicacion; el signal permite reactualizarlo si la UI lo requiere.
  protected readonly title = signal('mi-proyecto');
}

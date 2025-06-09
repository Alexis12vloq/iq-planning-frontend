import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';  // Para la barra de herramientas
import { MatButtonModule } from '@angular/material/button';    // Para los botones
import { MatMenuModule } from '@angular/material/menu';        // Para los menús y submenús
import { MatIconModule } from '@angular/material/icon';        // Para los íconos

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatMenuModule, MatIconModule, RouterOutlet, RouterModule],  // Importa los módulos de Material UI
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'iq-planning';
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { MenuItem } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  // Cache local para que el menu siga disponible si el backend falla.
  private readonly cacheStorageKey = 'casa-quetzal-menu-cache-v1';
  private readonly apiUrl = 'http://localhost:3000/api/productos';
  private readonly menuCache = this.readMenuCache();
  private request$: Observable<MenuItem[]> | null = null;

  getAll(): Observable<MenuItem[]> {
    // shareReplay + request$ evitan disparar multiples HTTP si varios componentes piden el menu.
    if (this.request$) {
      return this.request$;
    }

    this.request$ = this.http.get<MenuItem[]>(this.apiUrl).pipe(
      switchMap((apiItems) => {
        // Validar la frontera HTTP es FUNDAMENTAL: TypeScript no valida JSON en runtime.
        if (Array.isArray(apiItems) && apiItems.every((item) => this.isMenuItem(item))) {
          return of(apiItems);
        }

        throw new Error('La API devolvio datos invalidos');
      }),
      catchError(() => {
        // Estrategia por capas: API -> cache local -> XML publico -> datos de emergencia.
        if (this.menuCache.length > 0) {
          return of(this.menuCache);
        }

        return this.http.get('/productos.xml', { responseType: 'text' }).pipe(
          map((xmlText) => {
            const parsed = this.parseMenuWithDom(xmlText);
            return parsed.length > 0 ? parsed : this.getFallbackMenu();
          }),
          catchError(() => of(this.getFallbackMenu()))
        );
      }),
      tap((items) => {
        this.menuCache.splice(0, this.menuCache.length, ...items);
        this.writeMenuCache(items);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.request$;
  }

  private parseMenuWithDom(xmlText: string): MenuItem[] {
    // DOMParser permite convertir el XML estatico del proyecto al mismo contrato MenuItem.
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const parserError = doc.querySelector('parsererror');

    if (parserError) {
      return [];
    }

    return Array.from(doc.getElementsByTagName('product'))
      .map((node) => this.buildMenuItem(node))
      .filter((item): item is MenuItem => item !== null);
  }

  private buildMenuItem(node: Element): MenuItem | null {
    const id = Number(this.getTagText(node, 'id'));
    const price = Number(this.getTagText(node, 'price'));

    if (!Number.isFinite(id) || !Number.isFinite(price)) {
      return null;
    }

    return {
      id,
      name: this.getTagText(node, 'name'),
      price,
      imageUrl: this.getTagText(node, 'imageUrl'),
      category: this.getTagText(node, 'category'),
      description: this.getTagText(node, 'description'),
      inStock: this.getTagText(node, 'inStock').toLowerCase() === 'true',
      pairing: this.getTagText(node, 'pairing') || 'Sugerencia del sommelier disponible en sala',
      season: this.getTagText(node, 'season') || 'Temporada actual',
    };
  }

  private getTagText(node: Element, tagName: string): string {
    return node.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? '';
  }

  private readMenuCache(): MenuItem[] {
    try {
      const raw = localStorage.getItem(this.cacheStorageKey);

      if (!raw) {
        return [];
      }

      const parsed: unknown = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is MenuItem => this.isMenuItem(item));
    } catch {
      return [];
    }
  }

  private writeMenuCache(items: MenuItem[]): void {
    try {
      localStorage.setItem(this.cacheStorageKey, JSON.stringify(items));
    } catch {
      // Ignored: cache persistence is best-effort only.
    }
  }

  private isMenuItem(item: unknown): item is MenuItem {
    // Type guard: convierte datos "unknown" en MenuItem solo si cumplen el contrato completo.
    if (!item || typeof item !== 'object') {
      return false;
    }

    const candidate = item as Partial<MenuItem>;

    return (
      typeof candidate.id === 'number' &&
      typeof candidate.name === 'string' &&
      typeof candidate.price === 'number' &&
      typeof candidate.imageUrl === 'string' &&
      typeof candidate.category === 'string' &&
      typeof candidate.description === 'string' &&
      typeof candidate.inStock === 'boolean' &&
      typeof candidate.pairing === 'string' &&
      typeof candidate.season === 'string'
    );
  }

  private getFallbackMenu(): MenuItem[] {
    return [
      {
        id: 1,
        name: 'Tostada de Atun Aleta Azul',
        price: 275,
        imageUrl: '/img/Tostada-de-Atun-Aleta-Azul.webp',
        category: 'Entradas',
        description: 'Atun marinado en citricos, aguacate tatemado y brotes de cilantro criollo.',
        inStock: true,
        pairing: 'Sauvignon Blanc del Valle de Guadalupe',
        season: 'Primavera - Verano',
      },
      {
        id: 2,
        name: 'Aguachile Negro de Camaron',
        price: 295,
        imageUrl: '/img/Aguachile-Negro-de-Camaron.webp',
        category: 'Entradas',
        description: 'Camaron curado, pepino encurtido y emulsiones de chile chilhuacle negro.',
        inStock: true,
        pairing: 'Vino rosado seco de Baja California',
        season: 'Primavera - Verano',
      },
      {
        id: 3,
        name: 'Sope de Huitlacoche y Queso de Oveja',
        price: 260,
        imageUrl: '/img/Sope-de-Huitlacoche-y-Queso-de-Oveja.webp',
        category: 'Entradas',
        description: 'Masa azul crocante, salsa de tomatillo tatemado y brotes de temporada.',
        inStock: true,
        pairing: 'Pinot Noir joven',
        season: 'Otonio - Invierno',
      },
      {
        id: 4,
        name: 'Crema de Elote Ahumado',
        price: 240,
        imageUrl: '/img/Crema-de-Elote-Ahumado.webp',
        category: 'Entradas',
        description: 'Espuma de queso Cotija y aceite de chile ancho para una entrada sedosa.',
        inStock: true,
        pairing: 'Mezcal joven con naranja deshidratada',
        season: 'Todo el anio',
      },
      {
        id: 5,
        name: 'Taco de Lechon Confitado',
        price: 315,
        imageUrl: '/img/Taco-de-Lechon-Confitado.webp',
        category: 'Entradas',
        description: 'Lechon cocido a baja temperatura, cebolla curtida y pure de frijol ayocote.',
        inStock: true,
        pairing: 'Paloma clarificada de toronja',
        season: 'Todo el anio',
      },
      {
        id: 6,
        name: 'Rib Eye en Costra de Cacao',
        price: 640,
        imageUrl: '/img/Rib-Eye-en-Costra-de-Cacao.webp',
        category: 'Fuertes',
        description: 'Corte premium, pure de camote rostizado y demi-glace de chile pasilla.',
        inStock: true,
        pairing: 'Syrah reserva de Coahuila',
        season: 'Otonio - Invierno',
      },
      {
        id: 7,
        name: 'Pesca del Dia al Pipian Verde',
        price: 520,
        imageUrl: '/img/Pesca-del-Dia-al-Pipian-Verde.webp',
        category: 'Fuertes',
        description: 'Filete sellado con vegetales baby y pipian de pepita y hierbas de huerto.',
        inStock: true,
        pairing: 'Chardonnay con barrica ligera',
        season: 'Primavera - Verano',
      },
      {
        id: 8,
        name: 'Pato en Mole de Ciruela',
        price: 590,
        imageUrl: '/img/Pato-en-Mole-de-Ciruela.webp',
        category: 'Fuertes',
        description: 'Pechuga sellada, mole de ciruela especiado y pure de coliflor rostizada.',
        inStock: true,
        pairing: 'Tempranillo mexicano de altura',
        season: 'Otonio - Invierno',
      },
      {
        id: 9,
        name: 'Arroz Meloso de Mariscos',
        price: 560,
        imageUrl: '/img/Arroz-Meloso-de-Mariscos.webp',
        category: 'Fuertes',
        description: 'Caldo concentrado de mar, azafran, pulpo rostizado y camaron del Pacifico.',
        inStock: true,
        pairing: 'Albarino de expresion mineral',
        season: 'Primavera - Verano',
      },
      {
        id: 10,
        name: 'Negroni de Guayaba y Romero',
        price: 230,
        imageUrl: '/img/Negroni-de-Guayaba-y-Romero.webp',
        category: 'Mixologia',
        description: 'Gin botanico, bitter italiano y cordial de guayaba con romero flameado.',
        inStock: true,
        pairing: 'Ideal con entradas frias',
        season: 'Menu de autor',
      },
      {
        id: 11,
        name: 'Margarita de Jamaica Ahumada',
        price: 220,
        imageUrl: '/img/Margarita-de-Jamaica-Ahumada.webp',
        category: 'Mixologia',
        description: 'Tequila reposado, licor de naranja y jarabe de jamaica con sal de gusano.',
        inStock: true,
        pairing: 'Recomendado para platos especiados',
        season: 'Menu de autor',
      },
      {
        id: 12,
        name: 'Mousse de Chocolate Oaxaqueno',
        price: 210,
        imageUrl: '/img/Mousse-de-Chocolate-Oaxaqueno.webp',
        category: 'Postres',
        description: 'Cacao de origen, crumble de cacao nibs y helado artesanal de vainilla.',
        inStock: true,
        pairing: 'Licor de cafe de altura',
        season: 'Todo el anio',
      },
      {
        id: 13,
        name: 'Carajillo de Maiz Tostado',
        price: 215,
        imageUrl: '/img/Carajillo-de-Maiz-Tostado.webp',
        category: 'Mixologia',
        description: 'Licor de cafe, destilado de maiz y espuma ligera de canela.',
        inStock: true,
        pairing: 'Ideal para cierre de degustacion',
        season: 'Menu de autor',
      },
      {
        id: 14,
        name: 'Xoconostle Spritz Sin Alcohol',
        price: 185,
        imageUrl: '/img/Xoconostle-Spritz-Sin-Alcohol.webp',
        category: 'Mixologia',
        description: 'Xoconostle, toronja y agua mineral con aceite de limon mexicano.',
        inStock: true,
        pairing: 'Perfecto para entradas frescas',
        season: 'Primavera - Verano',
      },
    ];
  }
}

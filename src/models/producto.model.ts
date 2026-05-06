// Contrato central del menu.
// Si backend, XML y frontend respetan esta forma, la UI no necesita saber de donde vino el dato.
export interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  category: string;
  description: string;
  inStock: boolean;
  pairing: string;
  season: string;
}

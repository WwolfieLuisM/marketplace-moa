export type Foto = {
  id: string;
  cloudinaryPublicId: string;
  orden: number;
  url?: string;
};

export type Producto = {
  id: string;
  publicacionId: string;
  nombre: string;
  descripcion?: string | null;
  precio: string;
  cantidad: number;
  categoria?: { id: number; nombre: string } | null;
  orden: number;
  estado: string;
  fotos: Foto[];
};

export type FeedVendedor = {
  user: { nombre: string; apellidos?: string | null };
};

export type FeedPublicacion = {
  id: string;
  titulo: string;
  reparto?: string | null;
  conDomicilio: boolean;
  telefonoFijo?: string | null;
  telefonoMovil?: string | null;
  estado: string;
  creadoEn: string;
  score?: number;
  vendedor?: FeedVendedor | null;
  productos: Producto[];
};

export type Categoria = { id: number; nombre: string };

export type ProductoResultado = Producto & {
  score: number;
  publicacion: {
    id: string;
    titulo: string;
    reparto?: string | null;
    conDomicilio: boolean;
    telefonoFijo?: string | null;
    telefonoMovil?: string | null;
    estado: string;
    creadoEn: string;
    vendedor?: FeedVendedor | null;
  };
};

export const REPARTOS_MOA = [
  "Centro",
  "Atlántico",
  "Caribe",
  "José Martí",
  "La Playa",
  "Las Coloradas",
  "Los Checos",
  "Los Mangos",
  "Miraflores",
  "Rolo Monterrey",
  "Otro municipio",
];
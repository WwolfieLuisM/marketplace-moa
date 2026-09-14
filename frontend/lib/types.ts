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

export type ZonaDomicilio = {
  id: string;
  reparto: string;
  costoDomicilio: string;
  tiempoEstimado: string;
};

export type DetalleVendedor = {
  id: string;
  userId: string;
  tipo: string;
  nombreNegocio?: string | null;
  categoriaNegocio?: string | null;
  horarioAtencion?: string | null;
  direccionFisica?: string | null;
  estadoSuscripcion: string;
  user?: { id?: string; nombre: string; apellidos?: string | null; reparto?: string | null } | null;
  zonas?: ZonaDomicilio[];
};

export type DetallePublicacion = {
  id: string;
  titulo: string;
  reparto?: string | null;
  conDomicilio: boolean;
  telefonoFijo?: string | null;
  telefonoMovil?: string | null;
  estado: string;
  creadoEn: string;
  vendedor?: DetalleVendedor | null;
  productos: Producto[];
};

export type Mensaje = {
  id: string;
  remitenteId: string;
  destinatarioId: string;
  productoId?: string | null;
  contenido: string;
  leido: boolean;
  creadoEn: string;
  remitente?: { id: string; nombre: string; apellidos?: string | null };
  producto?: { id: string; nombre: string } | null;
};

export type Conversacion = {
  otroUsuarioId: string;
  otroUsuario: { id: string; nombre: string; apellidos?: string | null };
  ultimoMensaje: Mensaje;
  noLeidos: number;
};

export type HiloConversacion = {
  otroUsuario: { id: string; nombre: string; apellidos?: string | null };
  mensajes: Mensaje[];
};

export type VendedorPerfil = {
  id: string;
  userId: string;
  tipo: string;
  nombreNegocio?: string | null;
  categoriaNegocio?: string | null;
  horarioAtencion?: string | null;
  direccionFisica?: string | null;
  estadoLicencia: string;
  estadoSuscripcion: string;
  demoIniciaEn?: string | null;
  demoTerminaEn?: string | null;
  productosTotalDemo: number;
  productosHoy: number;
  fechaVencido?: string | null;
  suscripcionVenceEn?: string | null;
  aprobadoEn?: string | null;
  rol: string;
};
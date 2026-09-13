-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "password_hash" TEXT,
    "auth_provider" TEXT NOT NULL,
    "reparto" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'usuario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificacion_identidad" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "numero_ci" TEXT NOT NULL,
    "capturado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verificacion_identidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendedor_perfil" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre_negocio" TEXT,
    "categoria_negocio" TEXT,
    "horario_atencion" TEXT,
    "direccion_fisica" TEXT,
    "estado_licencia" TEXT NOT NULL DEFAULT 'pendiente',
    "estado_suscripcion" TEXT NOT NULL DEFAULT 'demo',
    "demo_inicia_en" TIMESTAMPTZ(6),
    "demo_termina_en" TIMESTAMPTZ(6),
    "productos_total_demo" INTEGER NOT NULL DEFAULT 0,
    "productos_hoy" INTEGER NOT NULL DEFAULT 0,
    "ultimo_reset_contador" DATE,
    "fecha_vencido" TIMESTAMPTZ(6),
    "suscripcion_vence_en" DATE,
    "ultimo_pago_en" DATE,
    "aprobado_por" UUID,
    "aprobado_en" TIMESTAMPTZ(6),

    CONSTRAINT "vendedor_perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zona_domicilio" (
    "id" UUID NOT NULL,
    "vendedor_id" UUID NOT NULL,
    "reparto" TEXT NOT NULL,
    "costo_domicilio" DECIMAL(10,2) NOT NULL,
    "tiempo_estimado" TEXT NOT NULL,

    CONSTRAINT "zona_domicilio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicaciones" (
    "id" UUID NOT NULL,
    "vendedor_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "reparto" TEXT NOT NULL,
    "con_domicilio" BOOLEAN NOT NULL DEFAULT false,
    "telefono_fijo" TEXT,
    "telefono_movil" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL,
    "publicacion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_fotos" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "producto_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" UUID NOT NULL,
    "remitente_id" UUID NOT NULL,
    "destinatario_id" UUID NOT NULL,
    "producto_id" UUID,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL DEFAULT 'web',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoritos" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id" UUID NOT NULL,
    "reportado_por" UUID NOT NULL,
    "publicacion_id" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verificacion_identidad_user_id_key" ON "verificacion_identidad"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendedor_perfil_user_id_key" ON "vendedor_perfil"("user_id");

-- CreateIndex
CREATE INDEX "idx_vendedor_perfil_estado" ON "vendedor_perfil"("estado_suscripcion", "demo_termina_en");

-- CreateIndex
CREATE INDEX "idx_publicaciones_reparto" ON "publicaciones"("reparto", "estado");

-- CreateIndex
CREATE INDEX "idx_publicaciones_vendedor" ON "publicaciones"("vendedor_id");

-- CreateIndex
CREATE INDEX "idx_productos_estado" ON "productos"("estado");

-- CreateIndex
CREATE INDEX "idx_productos_categoria" ON "productos"("categoria_id");

-- CreateIndex
CREATE INDEX "idx_mensajes_destinatario" ON "mensajes"("destinatario_id", "leido");

-- CreateIndex
CREATE UNIQUE INDEX "uq_favorito_user_producto" ON "favoritos"("user_id", "producto_id");

-- AddForeignKey
ALTER TABLE "verificacion_identidad" ADD CONSTRAINT "verificacion_identidad_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedor_perfil" ADD CONSTRAINT "vendedor_perfil_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedor_perfil" ADD CONSTRAINT "vendedor_perfil_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona_domicilio" ADD CONSTRAINT "zona_domicilio_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedor_perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedor_perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_fotos" ADD CONSTRAINT "producto_fotos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_remitente_id_fkey" FOREIGN KEY ("remitente_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_reportado_por_fkey" FOREIGN KEY ("reportado_por") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

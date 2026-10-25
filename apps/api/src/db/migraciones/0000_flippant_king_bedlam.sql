CREATE TABLE "bitacora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"entidad" text NOT NULL,
	"entidad_id" uuid,
	"campo" text,
	"antes" jsonb,
	"despues" jsonb,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"moneda" text DEFAULT 'USD' NOT NULL,
	"iva" numeric(9, 4) DEFAULT '15' NOT NULL,
	"factor_materiales" numeric(18, 6) DEFAULT '1' NOT NULL,
	"pct_herramienta_menor" numeric(9, 4) DEFAULT '5' NOT NULL,
	"disciplinas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ajustes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contenido" jsonb NOT NULL,
	"firma" text NOT NULL,
	"instalacion" text NOT NULL,
	"cargada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre_usuario" text NOT NULL,
	"nombre" text NOT NULL,
	"clave_hash" text NOT NULL,
	"rol" text NOT NULL,
	"disciplinas" text[] DEFAULT '{}' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_nombre_usuario_unique" UNIQUE("nombre_usuario")
);
--> statement-breakpoint
CREATE TABLE "apu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"descripcion" text NOT NULL,
	"unidad" text NOT NULL,
	"disciplina" text,
	"rendimiento" numeric(18, 6) DEFAULT '1' NOT NULL,
	"pct_herramienta_menor" numeric(9, 4) DEFAULT '5' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial_precio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insumo_id" uuid NOT NULL,
	"pu_anterior" numeric(18, 6),
	"pu_nuevo" numeric(18, 6) NOT NULL,
	"usuario_id" uuid,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insumo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"codigo" text NOT NULL,
	"descripcion" text NOT NULL,
	"unidad" text NOT NULL,
	"pu" numeric(18, 6) DEFAULT '0' NOT NULL,
	"precio_anterior" numeric(18, 6),
	"seccion" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linea_apu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apu_id" uuid NOT NULL,
	"insumo_id" uuid NOT NULL,
	"cantidad" numeric(18, 6) NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bloque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"disciplina" text,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capitulo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"disciplina" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indirecto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"porcentaje" numeric(9, 4) NOT NULL,
	"es_utilidad" boolean DEFAULT false NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linea_bloque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bloque_id" uuid NOT NULL,
	"apu_id" uuid NOT NULL,
	"cantidad" numeric(18, 6) NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oferta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"cliente" text,
	"tipo" text DEFAULT 'privado' NOT NULL,
	"estado" text DEFAULT 'borrador' NOT NULL,
	"costo_objetivo" numeric(18, 2),
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid NOT NULL,
	"capitulo_id" uuid NOT NULL,
	"apu_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"cantidad" numeric(18, 6) DEFAULT '0' NOT NULL,
	"cpc" text,
	"origen" text,
	"vae" numeric(9, 4),
	"orden" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"actualizado_por" uuid,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "version_oferta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"nombre" text,
	"emitida" boolean DEFAULT false NOT NULL,
	"snapshot" jsonb NOT NULL,
	"total" numeric(18, 2) NOT NULL,
	"creada_por" uuid,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historial_precio" ADD CONSTRAINT "historial_precio_insumo_id_insumo_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linea_apu" ADD CONSTRAINT "linea_apu_apu_id_apu_id_fk" FOREIGN KEY ("apu_id") REFERENCES "public"."apu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linea_apu" ADD CONSTRAINT "linea_apu_insumo_id_insumo_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capitulo" ADD CONSTRAINT "capitulo_oferta_id_oferta_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."oferta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indirecto" ADD CONSTRAINT "indirecto_oferta_id_oferta_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."oferta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linea_bloque" ADD CONSTRAINT "linea_bloque_bloque_id_bloque_id_fk" FOREIGN KEY ("bloque_id") REFERENCES "public"."bloque"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linea_bloque" ADD CONSTRAINT "linea_bloque_apu_id_apu_id_fk" FOREIGN KEY ("apu_id") REFERENCES "public"."apu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubro" ADD CONSTRAINT "rubro_oferta_id_oferta_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."oferta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubro" ADD CONSTRAINT "rubro_capitulo_id_capitulo_id_fk" FOREIGN KEY ("capitulo_id") REFERENCES "public"."capitulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubro" ADD CONSTRAINT "rubro_apu_id_apu_id_fk" FOREIGN KEY ("apu_id") REFERENCES "public"."apu"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_oferta" ADD CONSTRAINT "version_oferta_oferta_id_oferta_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."oferta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rubro_oferta_capitulo_orden" ON "rubro" USING btree ("oferta_id","capitulo_id","orden");
CREATE TABLE "aviso_enviado" (
	"dia" date NOT NULL,
	"tipo" text NOT NULL,
	CONSTRAINT "aviso_enviado_dia_tipo_pk" PRIMARY KEY("dia","tipo")
);
--> statement-breakpoint
CREATE TABLE "evento_uso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evento_uso" ADD CONSTRAINT "evento_uso_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evento_uso_fecha" ON "evento_uso" USING btree ("fecha");
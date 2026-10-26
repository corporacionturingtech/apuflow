CREATE OR REPLACE FUNCTION notificar_cambio() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('cambios', json_build_object(
    'entidad', NEW.entidad,
    'entidadId', NEW.entidad_id,
    'campo', NEW.campo,
    'usuarioId', NEW.usuario_id,
    'fecha', NEW.fecha
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER bitacora_notificar AFTER INSERT ON bitacora
FOR EACH ROW EXECUTE FUNCTION notificar_cambio();

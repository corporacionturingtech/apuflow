import { createPublicKey, verify } from 'node:crypto';
import { esquemaLicenciaArchivo, type LicenciaArchivo } from 'tipos';

// Clave pública de ejemplo (su privada se descartó): Turingtech la reemplaza por la real al emitir licencias; la instalación puede reemplazarla con LICENCIA_CLAVE_PUBLICA (PEM).
// La privada vive fuera de este repo.
const CLAVE_PUBLICA_EMBEBIDA = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA+rIsBxecJuDh0/JnjVOjxSsRuq8Ov4ixq+pyn1U+1aw=
-----END PUBLIC KEY-----`;

export const clavePublica = () => process.env.LICENCIA_CLAVE_PUBLICA ?? CLAVE_PUBLICA_EMBEBIDA;

// JSON con claves ordenadas: emisor y verificador firman exactamente los mismos bytes.
export function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') {
    const o = valor as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(valor);
}

/** Devuelve el archivo tipado si la forma y la firma Ed25519 son válidas; si no, null. */
export function verificarLicencia(crudo: unknown, pem = clavePublica()): LicenciaArchivo | null {
  const archivo = esquemaLicenciaArchivo.safeParse(crudo);
  if (!archivo.success) return null;
  try {
    const ok = verify(
      null,
      Buffer.from(canonico(archivo.data.contenido)),
      createPublicKey(pem),
      Buffer.from(archivo.data.firma, 'base64'),
    );
    return ok ? archivo.data : null;
  } catch {
    return null;
  }
}

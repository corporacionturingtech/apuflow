export class ErrorApi extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}) {
  let res: Response;
  try {
    res = await fetch(ruta, {
      method: opciones.metodo ?? 'GET',
      credentials: 'include',
      headers: opciones.cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'No pudimos conectar con el servidor. Intente de nuevo.');
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { mensaje?: string } | null;
    throw new ErrorApi(res.status, j?.mensaje ?? 'Algo salió mal. Intente de nuevo.');
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Envía un archivo como cuerpo binario (la importación de Excel). */
export async function subirArchivo<T>(ruta: string, archivo: File) {
  let res: Response;
  try {
    res = await fetch(ruta, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Nombre-Archivo': encodeURIComponent(archivo.name),
      },
      body: archivo,
    });
  } catch {
    throw new ErrorApi(0, 'No pudimos conectar con el servidor. Intente de nuevo.');
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { mensaje?: string } | null;
    throw new ErrorApi(res.status, j?.mensaje ?? 'Algo salió mal. Intente de nuevo.');
  }
  return (await res.json()) as T;
}

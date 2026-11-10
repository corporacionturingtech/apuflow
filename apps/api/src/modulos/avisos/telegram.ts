// Avisos de uso por Telegram, configurados por instancia con variables de entorno.
// Sin token o sin chat no se envía nada: la demo y los clientes sin avisos siguen igual.

export type ConfigAvisos = {
  token: string;
  chat: string;
  /** Hora de Ecuador (0-23) desde la que se envía el resumen del día. */
  hora: number;
  /** Nombres de usuario que no se reportan (p. ej. soporte de Turingtech). */
  ignorar: string[];
};

export function configAvisos(env: NodeJS.ProcessEnv = process.env): ConfigAvisos | null {
  const token = env.AVISO_TELEGRAM_TOKEN?.trim();
  const chat = env.AVISO_TELEGRAM_CHAT?.trim();
  if (!token || !chat) return null;
  const hora = Number(env.AVISO_HORA ?? 19);
  return {
    token,
    chat,
    hora: Number.isInteger(hora) && hora >= 0 && hora <= 23 ? hora : 19,
    ignorar: (env.AVISO_IGNORAR ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

// Nunca lanza: un aviso fallido no debe tumbar el login ni el reloj del resumen.
export async function enviarTelegram(cfg: ConfigAvisos, texto: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.chat, text: texto }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) console.warn(`[avisos] Telegram respondió ${r.status}`);
    return r.ok;
  } catch (e) {
    console.warn('[avisos] No se pudo enviar a Telegram:', (e as Error).message);
    return false;
  }
}

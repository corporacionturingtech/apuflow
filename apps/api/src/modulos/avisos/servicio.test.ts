import { afterAll, afterEach, expect, test, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd, type Bd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { bitacora, eventoUso, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';
import { registrarExportacion, registrarIngreso, resumenSiToca } from './servicio';
import { textoResumen } from './resumen';
import type { ConfigAvisos } from './telegram';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

class Deshacer extends Error {}
const cfg: ConfigAvisos = { token: 't', chat: 'c', hora: 19, ignorar: ['tavi-soporte'] };
// Lunes 9 nov 2026 en Ecuador (UTC-5).
const a = (hora: string) => new Date(`2026-11-09T${hora}:00-05:00`);

async function usuarioPrueba(t: Bd, nombreUsuario: string, nombre: string) {
  await crearUsuario(t, { nombreUsuario, nombre, clave: 'clave-segura-1', rol: 'admin' });
  return (await t.select().from(usuario).where(eq(usuario.nombreUsuario, nombreUsuario)))[0]!;
}

test('aviso solo en el primer ingreso del día y nunca para los ignorados', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      const u = await usuarioPrueba(t, 'tavi-cliente', 'Cliente Prueba');
      const sop = await usuarioPrueba(t, 'tavi-soporte', 'Soporte');

      const primero = await registrarIngreso(t, u, cfg, a('09:14'));
      expect(primero).toMatch(/· Cliente Prueba entró a Turing APU \(09:14\)\.$/);
      expect(await registrarIngreso(t, u, cfg, a('15:30'))).toBeNull();
      expect(
        await registrarIngreso(t, u, cfg, new Date('2026-11-10T08:00:00-05:00')),
      ).not.toBeNull();
      expect(await registrarIngreso(t, sop, cfg, a('10:00'))).toBeNull();
      expect(await registrarIngreso(t, u, null, a('11:00'))).toBeNull();

      const guardados = await t.select().from(eventoUso).where(eq(eventoUso.usuarioId, u.id));
      expect(guardados).toHaveLength(4);
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});

test('resumen diario: lo que hizo, una sola vez y desde la hora configurada', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      const u = await usuarioPrueba(t, 'tavi-res', 'Zoila Resumen');
      const quieto = await usuarioPrueba(t, 'tavi-quieto', 'Zacarías Quieto');
      await usuarioPrueba(t, 'tavi-soporte', 'Soporte Oculto');
      await registrarIngreso(t, quieto, cfg, new Date('2026-11-05T10:00:00-05:00'));
      await registrarIngreso(t, u, cfg, a('09:14'));
      await registrarIngreso(t, u, cfg, a('16:02'));
      await registrarExportacion(t, u.id, a('17:00'));
      const fila = { usuarioId: u.id, fecha: a('10:00') };
      await t.insert(bitacora).values([
        { ...fila, entidad: 'insumo', entidadId: u.id, campo: 'pu', antes: { valor: '8.4' } },
        { ...fila, entidad: 'insumo', entidadId: u.id, campo: 'pu', antes: { valor: '8.9' } },
        { ...fila, entidad: 'oferta', despues: { nombre: 'Casa Familia Torres' } },
        { ...fila, entidad: 'capitulo', despues: { bloqueId: u.id } },
        { ...fila, entidad: 'rubro', campo: 'cantidad', antes: { valor: '1' } },
      ]);

      const enviar = vi.fn().mockResolvedValue(true);
      expect(await resumenSiToca(t, cfg, a('18:55'), enviar)).toBe(false);
      expect(await resumenSiToca(t, cfg, a('19:00'), enviar)).toBe(true);
      expect(await resumenSiToca(t, cfg, a('19:05'), enviar)).toBe(false);
      expect(enviar).toHaveBeenCalledTimes(1);

      const texto = enviar.mock.calls[0]![0] as string;
      expect(texto).toContain('lun, 9 nov · uso de Turing APU');
      expect(texto).toContain('✅ Zoila Resumen: entró (09:14, 2 veces)');
      expect(texto).toContain('• Cambió 1 precio');
      expect(texto).toContain('• Creó 1 oferta: «Casa Familia Torres»');
      expect(texto).toContain('• Añadió 1 bloque');
      expect(texto).toContain('• Exportó 1 Excel');
      expect(texto).toContain('• 1 cambio más en ofertas, APUs o listas');
      expect(texto).toContain(
        '⚪ Zacarías Quieto: no entró hoy. Último ingreso: jue, 5 nov (hace 4 días).',
      );
      expect(texto).toContain('⚠️ Lleva 4 días sin entrar');
      expect(texto).not.toContain('Soporte Oculto');
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});

test('si Telegram falla, el resumen se reintenta en la siguiente vuelta', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      const enviar = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      expect(await resumenSiToca(t, cfg, a('19:00'), enviar)).toBe(false);
      expect(await resumenSiToca(t, cfg, a('19:05'), enviar)).toBe(true);
      expect(enviar).toHaveBeenCalledTimes(2);
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});

test('textoResumen: quien solo revisó, quien nunca entró y quien faltó un día', () => {
  const base = { exportaciones: 0, precios: 0, ofertasNuevas: [], bloques: 0, otrosCambios: 0 };
  const texto = textoResumen('ARPECE', a('19:00'), [
    { ...base, nombre: 'Ana', ingresos: [a('08:05')], ultimoIngreso: null },
    { ...base, nombre: 'Beto', ingresos: [], ultimoIngreso: null },
    { ...base, nombre: 'Caro', ingresos: [], ultimoIngreso: new Date('2026-11-08T12:00:00-05:00') },
  ]);
  expect(texto).toContain('📊 ARPECE · lun, 9 nov');
  expect(texto).toContain('✅ Ana: entró (08:05)\n• Solo revisó: no hizo cambios');
  expect(texto).toContain('⚪ Beto: no ha entrado desde que se activaron los avisos.');
  expect(texto).toContain('Último ingreso: dom, 8 nov (hace 1 día).');
  expect(texto).not.toContain('Lleva 1 días');
});

test('un fallo de Telegram no impide entrar', async () => {
  vi.stubEnv('AVISO_TELEGRAM_TOKEN', 'token-prueba');
  vi.stubEnv('AVISO_TELEGRAM_CHAT', '-100');
  const falso = vi.fn().mockRejectedValue(new Error('sin red'));
  vi.stubGlobal('fetch', falso);
  const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      await usuarioPrueba(t, 'tavi-login', 'Login Prueba');
      const app = crearApp(t);
      const r = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { nombreUsuario: 'tavi-login', clave: 'clave-segura-1' },
      });
      expect(r.statusCode).toBe(200);
      await vi.waitFor(() => expect(falso).toHaveBeenCalledTimes(1));
      expect(String(falso.mock.calls[0]![0])).toContain('/bottoken-prueba/sendMessage');
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
  await vi.waitFor(() => expect(aviso).toHaveBeenCalled());
  aviso.mockRestore();
});

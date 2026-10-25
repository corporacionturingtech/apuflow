import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { esquemaLogin, type Rol, type UsuarioSesion } from 'tipos';
import type { Bd } from '../../db/conexion';
import { DURACION_SESION_MS, cerrarSesion, iniciarSesion, usuarioDeToken } from './servicio';

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: UsuarioSesion;
  }
  interface FastifyInstance {
    autenticar: (req: FastifyRequest, res: FastifyReply) => Promise<void>;
    exigirRol: (...roles: Rol[]) => (req: FastifyRequest, res: FastifyReply) => Promise<void>;
  }
}

const COOKIE = 'sesion';

// Síncrono (no plugin encapsulado) para que `autenticar`/`exigirRol` existan al declarar rutas en crearApp.
export function instalarAuth(app: FastifyInstance, db: Bd) {
  app.decorateRequest('usuario');

  app.decorate('autenticar', async (req: FastifyRequest, res: FastifyReply) => {
    const token = req.cookies[COOKIE];
    const u = token ? await usuarioDeToken(db, token) : null;
    if (!u) return res.code(401).send({ mensaje: 'Debe iniciar sesión' });
    req.usuario = u;
  });

  app.decorate('exigirRol', (...roles: Rol[]) => async (req: FastifyRequest, res: FastifyReply) => {
    await app.autenticar(req, res);
    if (res.sent) return;
    if (!roles.includes(req.usuario!.rol)) {
      return res.code(403).send({ mensaje: 'No tiene permiso para esta acción' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const entrada = esquemaLogin.safeParse(req.body);
    const r = entrada.success
      ? await iniciarSesion(db, entrada.data.nombreUsuario, entrada.data.clave)
      : null;
    if (!r) return res.code(401).send({ mensaje: 'Usuario o clave incorrectos' });
    res.setCookie(COOKIE, r.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: DURACION_SESION_MS / 1000,
    });
    return r.usuario;
  });

  app.post('/api/auth/logout', async (req, res) => {
    const token = req.cookies[COOKIE];
    if (token) await cerrarSesion(db, token);
    res.clearCookie(COOKIE, { path: '/' });
    return res.code(204).send();
  });

  app.get('/api/auth/yo', { preHandler: app.autenticar }, async (req) => req.usuario);
}

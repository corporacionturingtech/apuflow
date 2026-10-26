import type { FastifyInstance, FastifyReply } from 'fastify';
import { esquemaDisciplinasCambio, esquemaUsuarioCambio, esquemaUsuarioCrear } from 'tipos';
import type { Bd } from '../../db/conexion';
import {
  ConflictoVersion,
  LimiteUsuarios,
  NoExiste,
  NombreEnUso,
  SinPermiso,
  cambiar,
  cambiarDisciplinas,
  crear,
  disciplinasDeEmpresa,
  listar,
} from './servicio';

const datosInvalidos = { mensaje: 'Revise los datos ingresados' };
const esUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

function responderError(e: unknown, res: FastifyReply) {
  if (e instanceof NoExiste) return res.code(404).send({ mensaje: 'Ese usuario ya no existe' });
  if (e instanceof NombreEnUso) {
    return res.code(409).send({ mensaje: 'Ya existe un usuario con ese nombre de usuario' });
  }
  if (e instanceof SinPermiso) {
    return res
      .code(403)
      .send({ mensaje: 'No puede quitarse a sí mismo el rol de administrador ni desactivarse' });
  }
  if (e instanceof LimiteUsuarios) {
    return res.code(409).send({
      mensaje: 'Su licencia no permite más usuarios activos. Desactive uno o amplíe la licencia.',
    });
  }
  if (e instanceof ConflictoVersion) {
    return res.code(409).send({
      mensaje: 'Otra persona cambió estos datos. Se actualizó la pantalla; vuelva a intentarlo.',
    });
  }
  throw e;
}

export async function rutasUsuarios(app: FastifyInstance, { db }: { db: Bd }) {
  const soloAdmin = app.exigirRol('admin');

  app.get('/api/usuarios', { preHandler: soloAdmin }, async () => ({ usuarios: await listar(db) }));

  app.post('/api/usuarios', { preHandler: soloAdmin }, async (req, res) => {
    const d = esquemaUsuarioCrear.safeParse(req.body);
    if (!d.success) return res.code(400).send(datosInvalidos);
    try {
      return res.code(201).send(await crear(db, req.usuario!.id, d.data));
    } catch (e) {
      return responderError(e, res);
    }
  });

  app.patch<{ Params: { id: string } }>(
    '/api/usuarios/:id',
    { preHandler: soloAdmin },
    async (req, res) => {
      const d = esquemaUsuarioCambio.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id)) return res.code(400).send(datosInvalidos);
      try {
        return await cambiar(db, req.usuario!.id, req.params.id, d.data);
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.get('/api/empresa/disciplinas', { preHandler: app.autenticar }, () =>
    disciplinasDeEmpresa(db),
  );

  app.put('/api/empresa/disciplinas', { preHandler: soloAdmin }, async (req, res) => {
    const d = esquemaDisciplinasCambio.safeParse(req.body);
    if (!d.success) return res.code(400).send(datosInvalidos);
    try {
      return await cambiarDisciplinas(db, req.usuario!.id, d.data);
    } catch (e) {
      return responderError(e, res);
    }
  });
}

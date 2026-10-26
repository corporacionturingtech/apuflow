import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Disciplina, DisciplinasEmpresa, Rol, UsuarioFila } from 'tipos';
import { api, ErrorApi } from '../lib/api';

const ROLES: [Rol, string][] = [
  ['admin', 'Administrador'],
  ['precios', 'Precios'],
  ['cotizador', 'Cotizador'],
  ['lector', 'Lector'],
];
const CAMPO = 'rounded border border-slate-300 px-2 py-1 text-sm';
const BOTON = 'rounded bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50';
const COLORES = ['#d97706', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2'];

const mensaje = (e: unknown) => (e instanceof ErrorApi ? e.message : 'Algo salió mal.');

function Insignia({ nombre, disciplinas }: { nombre: string; disciplinas: Disciplina[] }) {
  const color = disciplinas.find((d) => d.nombre === nombre)?.color ?? '#64748b';
  return (
    <span
      className="mr-1 rounded-full px-2 py-0.5 text-xs text-white"
      style={{ backgroundColor: color }}
    >
      {nombre}
    </span>
  );
}

function FormularioUsuario({
  usuario,
  empresa,
  alTerminar,
}: {
  usuario?: UsuarioFila;
  empresa: DisciplinasEmpresa;
  alTerminar: () => void;
}) {
  const cliente = useQueryClient();
  const [nombreUsuario, setNombreUsuario] = useState(usuario?.nombreUsuario ?? '');
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [clave, setClave] = useState('');
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'cotizador');
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [marcadas, setMarcadas] = useState<string[]>(usuario?.disciplinas ?? []);

  const guardar = useMutation({
    mutationFn: () =>
      usuario
        ? api(`/api/usuarios/${usuario.id}`, {
            metodo: 'PATCH',
            cuerpo: {
              version: usuario.version,
              nombre,
              rol,
              activo,
              disciplinas: marcadas,
              ...(clave ? { clave } : {}),
            },
          })
        : api('/api/usuarios', {
            metodo: 'POST',
            cuerpo: { nombreUsuario, nombre, clave, rol, disciplinas: marcadas },
          }),
    onSuccess: async () => {
      await cliente.invalidateQueries({ queryKey: ['usuarios'] });
      alTerminar();
    },
  });

  const alternar = (n: string) =>
    setMarcadas((m) => (m.includes(n) ? m.filter((x) => x !== n) : [...m, n]));

  return (
    <form
      aria-label={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      className="mb-6 grid max-w-xl gap-3 rounded border border-slate-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        guardar.mutate();
      }}
    >
      <label className="grid gap-1 text-sm">
        Nombre de usuario
        <input
          className={CAMPO}
          value={nombreUsuario}
          disabled={!!usuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
          required
        />
      </label>
      <label className="grid gap-1 text-sm">
        Nombre completo
        <input
          className={CAMPO}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      </label>
      <label className="grid gap-1 text-sm">
        {usuario ? 'Nueva clave (opcional)' : 'Clave'}
        <input
          className={CAMPO}
          type="password"
          value={clave}
          minLength={8}
          required={!usuario}
          onChange={(e) => setClave(e.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Rol
        <select className={CAMPO} value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {ROLES.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="text-sm">
        <legend className="mb-1">Disciplinas</legend>
        {empresa.disciplinas.length === 0 && (
          <p className="text-slate-500">Defina las disciplinas de la empresa más abajo.</p>
        )}
        {empresa.disciplinas.map((d) => (
          <label key={d.nombre} className="mr-4 inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={marcadas.includes(d.nombre)}
              onChange={() => alternar(d.nombre)}
            />
            <Insignia nombre={d.nombre} disciplinas={empresa.disciplinas} />
          </label>
        ))}
      </fieldset>
      {usuario && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Usuario activo
        </label>
      )}
      {guardar.isError && (
        <p role="alert" className="text-sm text-red-700">
          {mensaje(guardar.error)}
        </p>
      )}
      <div className="flex gap-2">
        <button className={BOTON} disabled={guardar.isPending}>
          Guardar
        </button>
        <button type="button" className="text-sm underline" onClick={alTerminar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SeccionDisciplinas({ empresa }: { empresa: DisciplinasEmpresa }) {
  const cliente = useQueryClient();
  const [lista, setLista] = useState<Disciplina[]>(empresa.disciplinas);
  const [restringir, setRestringir] = useState(empresa.restringir);
  const [nueva, setNueva] = useState('');

  const guardar = useMutation({
    mutationFn: () =>
      api('/api/empresa/disciplinas', {
        metodo: 'PUT',
        cuerpo: { version: empresa.version, disciplinas: lista, restringir },
      }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['disciplinas'] }),
  });

  const agregar = () => {
    const n = nueva.trim();
    if (!n || lista.some((d) => d.nombre === n)) return;
    setLista([...lista, { nombre: n, color: COLORES[lista.length % COLORES.length]! }]);
    setNueva('');
  };

  return (
    <section aria-label="Disciplinas" className="mt-10 max-w-xl">
      <h2 className="mb-2 text-lg font-semibold">Disciplinas</h2>
      <ul className="mb-3 grid gap-2">
        {lista.map((d) => (
          <li key={d.nombre} className="flex items-center gap-2 text-sm">
            <input
              type="color"
              aria-label={`Color de ${d.nombre}`}
              value={d.color}
              onChange={(e) =>
                setLista(lista.map((x) => (x === d ? { ...x, color: e.target.value } : x)))
              }
            />
            <span className="flex-1">{d.nombre}</span>
            <button
              className="text-slate-500 underline"
              onClick={() => setLista(lista.filter((x) => x !== d))}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <div className="mb-3 flex gap-2">
        <input
          className={CAMPO}
          aria-label="Nueva disciplina"
          placeholder="Ej.: Mecánico"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
        <button className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={agregar}>
          Agregar disciplina
        </button>
      </div>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={restringir}
          onChange={(e) => setRestringir(e.target.checked)}
        />
        Restringir a cada cotizador a sus disciplinas
      </label>
      {guardar.isError && (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {mensaje(guardar.error)}
        </p>
      )}
      <button className={BOTON} disabled={guardar.isPending} onClick={() => guardar.mutate()}>
        Guardar disciplinas
      </button>
      {guardar.isSuccess && (
        <span role="status" className="ml-3 text-sm text-green-700">
          Guardado
        </span>
      )}
    </section>
  );
}

export function Usuarios() {
  const [editando, setEditando] = useState<UsuarioFila | 'nuevo' | null>(null);
  const usuarios = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api<{ usuarios: UsuarioFila[] }>('/api/usuarios'),
  });
  const empresa = useQuery({
    queryKey: ['disciplinas'],
    queryFn: () => api<DisciplinasEmpresa>('/api/empresa/disciplinas'),
  });

  if (usuarios.isError) {
    return <p role="alert">{mensaje(usuarios.error)}</p>;
  }
  if (!usuarios.data || !empresa.data) return <p>Cargando…</p>;
  const nombreRol = (r: Rol) => ROLES.find(([v]) => v === r)![1];

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <button className={BOTON} onClick={() => setEditando('nuevo')}>
          Nuevo usuario
        </button>
      </div>
      {editando && (
        <FormularioUsuario
          key={editando === 'nuevo' ? 'nuevo' : editando.id + editando.version}
          usuario={editando === 'nuevo' ? undefined : editando}
          empresa={empresa.data}
          alTerminar={() => setEditando(null)}
        />
      )}
      <table className="w-full max-w-3xl text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-1">Usuario</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Disciplinas</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {usuarios.data.usuarios.map((u) => (
            <tr key={u.id} className={u.activo ? '' : 'text-slate-400'}>
              <td className="py-1">{u.nombreUsuario}</td>
              <td>{u.nombre}</td>
              <td>{nombreRol(u.rol)}</td>
              <td>
                {u.disciplinas.map((d) => (
                  <Insignia key={d} nombre={d} disciplinas={empresa.data.disciplinas} />
                ))}
              </td>
              <td>
                <button
                  className="underline"
                  aria-label={`Editar ${u.nombreUsuario}`}
                  onClick={() => setEditando(u)}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <SeccionDisciplinas empresa={empresa.data} />
    </div>
  );
}

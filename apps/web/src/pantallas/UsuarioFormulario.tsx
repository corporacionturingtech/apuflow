import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Disciplina, DisciplinasEmpresa, Rol, UsuarioFila } from 'tipos';
import { api, ErrorApi } from '../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';

export const ROLES: [Rol, string][] = [
  ['admin', 'Administrador'],
  ['precios', 'Precios'],
  ['cotizador', 'Cotizador'],
  ['lector', 'Lector'],
];
export const mensaje = (e: unknown) => (e instanceof ErrorApi ? e.message : 'Algo salió mal.');

export function Insignia({ nombre, disciplinas }: { nombre: string; disciplinas: Disciplina[] }) {
  const color = disciplinas.find((d) => d.nombre === nombre)?.color ?? '#64748b';
  return (
    <span
      className="mr-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {nombre}
    </span>
  );
}

export function FormularioUsuario({
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
    <Card asChild className="mb-6 grid max-w-xl gap-3 p-4">
      <form
        aria-label={usuario ? 'Editar usuario' : 'Nuevo usuario'}
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate();
        }}
      >
        <Label className="grid gap-1">
          Nombre de usuario
          <Input
            value={nombreUsuario}
            disabled={!!usuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            required
          />
        </Label>
        <Label className="grid gap-1">
          Nombre completo
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </Label>
        <Label className="grid gap-1">
          {usuario ? 'Nueva clave (opcional)' : 'Clave'}
          <Input
            type="password"
            value={clave}
            minLength={8}
            required={!usuario}
            onChange={(e) => setClave(e.target.value)}
          />
        </Label>
        <Label className="grid gap-1">
          Rol
          <Select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            {ROLES.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </Select>
        </Label>
        <fieldset className="text-sm">
          <legend className="mb-1 font-medium text-slate-700">Disciplinas</legend>
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
          <Button disabled={guardar.isPending}>Guardar</Button>
          <Button type="button" variant="ghost" onClick={alTerminar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Disciplina, DisciplinasEmpresa, Rol, UsuarioFila } from 'tipos';
import { UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cargando } from '../ui/estado';
import { Input } from '../ui/input';
import { FormularioUsuario, Insignia, mensaje, ROLES } from './UsuarioFormulario';

const COLORES = ['#d97706', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#0891b2'];

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
    <Card asChild className="mt-8 max-w-xl p-4">
      <section aria-label="Disciplinas">
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLista(lista.filter((x) => x !== d))}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
        <div className="mb-3 flex gap-2">
          <Input
            className="w-60"
            aria-label="Nueva disciplina"
            placeholder="Ej.: Mecánico"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
          <Button variant="outline" onClick={agregar}>
            Agregar disciplina
          </Button>
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
        <Button disabled={guardar.isPending} onClick={() => guardar.mutate()}>
          Guardar disciplinas
        </Button>
        {guardar.isSuccess && (
          <span role="status" className="ml-3 text-sm text-emerald-700">
            Guardado
          </span>
        )}
      </section>
    </Card>
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
  if (!usuarios.data || !empresa.data) return <Cargando />;
  const nombreRol = (r: Rol) => ROLES.find(([v]) => v === r)![1];

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <Button onClick={() => setEditando('nuevo')}>
          <UserPlus aria-hidden />
          Nuevo usuario
        </Button>
      </div>
      {editando && (
        <FormularioUsuario
          key={editando === 'nuevo' ? 'nuevo' : editando.id + editando.version}
          usuario={editando === 'nuevo' ? undefined : editando}
          empresa={empresa.data}
          alTerminar={() => setEditando(null)}
        />
      )}
      <Card className="max-w-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Rol</th>
              <th className="px-3 py-2 font-medium">Disciplinas</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {usuarios.data.usuarios.map((u) => (
              <tr key={u.id} className={'hover:bg-slate-50 ' + (u.activo ? '' : 'text-slate-400')}>
                <td className="px-3 py-1.5 font-medium">{u.nombreUsuario}</td>
                <td className="px-3 py-1.5">{u.nombre}</td>
                <td className="px-3 py-1.5">
                  {nombreRol(u.rol)}
                  {!u.activo && <Badge className="ml-2">Inactivo</Badge>}
                </td>
                <td className="px-3 py-1.5">
                  {u.disciplinas.map((d) => (
                    <Insignia key={d} nombre={d} disciplinas={empresa.data.disciplinas} />
                  ))}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Editar ${u.nombreUsuario}`}
                    onClick={() => setEditando(u)}
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <SeccionDisciplinas empresa={empresa.data} />
    </div>
  );
}

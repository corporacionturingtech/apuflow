// Extrae el literal `DATA` del prototipo v2 a un JSON para las pruebas del motor.
// Lee el HTML aquí mismo para no cargar el archivo entero en ninguna conversación.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origen = resolve(raiz, 'referencia/prototipo_v2.html');
const destino = resolve(raiz, 'packages/motor/test/fixtures/sedemi-demo.json');

const html = readFileSync(origen, 'utf8');
const inicio = /(?:const|let|var)\s+DATA\s*=\s*/.exec(html);
if (!inicio) throw new Error('No se encontró la declaración de DATA en el prototipo');

// Recorre el texto balanceando llaves/corchetes, saltando cadenas y comentarios.
function literalDesde(texto: string, desde: number): string {
  let profundidad = 0;
  let comilla: string | null = null;
  for (let i = desde; i < texto.length; i++) {
    const c = texto[i]!;
    if (comilla) {
      if (c === '\\') i++;
      else if (c === comilla) comilla = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') comilla = c;
    else if (c === '/' && texto[i + 1] === '/') i = texto.indexOf('\n', i) - 1;
    else if (c === '/' && texto[i + 1] === '*') i = texto.indexOf('*/', i) + 1;
    else if (c === '{' || c === '[') profundidad++;
    else if (c === '}' || c === ']') {
      profundidad--;
      if (profundidad === 0) return texto.slice(desde, i + 1);
    }
  }
  throw new Error('El literal de DATA no cierra');
}

const literal = literalDesde(html, inicio.index + inicio[0].length);
const data = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 2000 }) as Record<
  string,
  unknown
>;

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify(data, null, 2) + '\n');

for (const [clave, valor] of Object.entries(data)) {
  const n = Array.isArray(valor)
    ? `${valor.length} elementos`
    : valor && typeof valor === 'object'
      ? `${Object.keys(valor).length} claves`
      : String(valor);
  console.log(`${clave}: ${n}`);
}
console.log(`Escrito ${destino}`);

import { generateKeyPairSync, sign } from 'node:crypto';
import { expect, test } from 'vitest';
import type { LicenciaContenido } from 'tipos';
import { contenido } from './contenido-prueba';
import { canonico, verificarLicencia } from './verificar';

const par = generateKeyPairSync('ed25519');
const pem = par.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const ajena = generateKeyPairSync('ed25519')
  .publicKey.export({ type: 'spki', format: 'pem' })
  .toString();

const firmar = (c: LicenciaContenido) =>
  sign(null, Buffer.from(canonico(c)), par.privateKey).toString('base64');

test('firma válida', () => {
  expect(verificarLicencia({ contenido, firma: firmar(contenido) }, pem)?.contenido).toEqual(
    contenido,
  );
});

test('el orden de las claves no importa', () => {
  const revuelto = Object.fromEntries(Object.entries(contenido).reverse());
  expect(verificarLicencia({ contenido: revuelto, firma: firmar(contenido) }, pem)).not.toBeNull();
});

test('contenido alterado se rechaza', () => {
  const firma = firmar(contenido);
  expect(
    verificarLicencia({ contenido: { ...contenido, maxUsuarios: 500 }, firma }, pem),
  ).toBeNull();
});

test('firma de otra clave o forma inválida se rechaza', () => {
  const archivo = { contenido, firma: firmar(contenido) };
  expect(verificarLicencia(archivo, ajena)).toBeNull();
  expect(verificarLicencia({ contenido }, pem)).toBeNull();
  expect(verificarLicencia({ contenido, firma: 'no-es-base64-valido' }, pem)).toBeNull();
});

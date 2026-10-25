import { migrarBd } from '../src/db/migrar';
import { urlBdPruebas } from '../src/db/url';

export default async function () {
  await migrarBd(urlBdPruebas());
}

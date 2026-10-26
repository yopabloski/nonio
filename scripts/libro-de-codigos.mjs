// Genera docs/LIBRO_DE_CODIGOS.md desde js/domain/instrumentos.js (fuente única).
// Uso: npm run libro
import fs from 'node:fs';
import { INSTRUMENTOS, ESCALAS, NO_RESPONDE, varItem, varDim, puntuaciones } from '../js/domain/instrumentos.js';
import { MAX_PERDIDOS } from '../js/domain/puntajes.js';

const L = [];
L.push('# Nonio · estudio AMA·PERMA · Libro de códigos', '');
L.push('> Generado automáticamente desde `js/domain/instrumentos.js`. No editar a mano: cambie la fuente y ejecute `npm run libro`.', '');
L.push('## Convenciones', '');
L.push('- Una fila por participante y momento. Llave de cruce con datos académicos: `CORREO`. `ID` es un seudónimo estable derivado del correo.');
L.push(`- "Prefiero no responder": vacío en Excel/CSV/JASP; \`${NO_RESPONDE}\` declarado como perdido en SPSS.`);
L.push(`- Puntajes: promedio simple de los ítems, en la métrica original. Queda vacío si falta más del ${MAX_PERDIDOS * 100} % de los ítems de esa puntuación.`);
L.push('- Ningún instrumento tiene ítems inversos.', '');
for (const inst of INSTRUMENTOS) {
  L.push(`## ${inst.sigla} · ${inst.nombre}`, '');
  L.push(`**Constructo:** ${inst.constructo}. **Referencia:** ${inst.referencia}`, '');
  L.push(`**Enunciado:** ${inst.enunciado}`, '');
  L.push(`**Instrucciones:** ${inst.instrucciones}`, '');
  const esc = ESCALAS[inst.escala];
  L.push(`**Escala:** ${inst.escala === 'perma11' ? '0 a 10, anclas por ítem en los extremos' : esc.map(o => o.etiqueta ? `${o.valor} = ${o.etiqueta}` : String(o.valor)).join(' · ')}`, '');
  L.push('| Variable | N° | Código | Enunciado | Anclas |', '|---|---|---|---|---|');
  for (const it of inst.items) L.push(`| \`${varItem(inst, it.n)}\` | ${it.n} | ${it.codigo || ''} | ${it.texto} | ${it.anclas ? `0 = ${it.anclas[0]} · 10 = ${it.anclas[1]}` : ''} |`);
  L.push('', '| Puntuación | Nombre | Cálculo |', '|---|---|---|');
  for (const p of puntuaciones(inst)) L.push(`| \`${varDim(inst, p.id)}\` | ${p.nombre} | ${p.compuesto ? 'promedio de ' + p.dimensiones.map(d => '`' + varDim(inst, d) + '`').join(', ') : 'promedio de ítems ' + p.items.join(', ')} |`);
  L.push('', `*${inst.notas}*`, '');
}
fs.writeFileSync(new URL('../docs/LIBRO_DE_CODIGOS.md', import.meta.url), L.join('\n'));
console.log('docs/LIBRO_DE_CODIGOS.md actualizado');

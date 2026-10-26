# Nonio · Diseño

## Idea rectora

**Un instrumento de medición.** Papel de laboratorio con cuadrícula tenue, tinta pizarra, reglas graduadas como motivo gráfico y un acento maíz que marca lo que importa ahora. El formato sigue el de MusicFest (módulo sin compilación, tarjetas, panel con puerta docente), pero con otra paleta y otro tono: sereno y académico en vez de festival.

## Nombre y logo

- **Nonio** es la plataforma; cada estudio lleva su nombre al lado ("Nonio · AMA-PERMA"). Así se pueden sumar instrumentos y estudios sin cambiar la marca.
- **Logo "Lectura":** una escala de 5 puntos (Likert) con un cursor en maíz. El cursor es el mismo punto que separa plataforma y estudio. No lleva texto, así que funciona igual a 16, 32 y 38 px.
- Sobre fondo claro va con placa de tinta; sobre fondo oscuro (lateral del panel) va sin placa: escala en papel y cursor en maíz.
- Archivo: `assets/favicon.svg`. En el HTML el logo va como SVG en línea (clase `.marca-sello`).

## Tipografía

- **Fraunces:** títulos. Serif con carácter y cursiva expresiva.
- **Instrument Sans:** lectura, formularios y enunciados de los ítems.
- **JetBrains Mono:** números, códigos, variables y etiquetas técnicas.

## Paleta

| Rol | Color | Uso |
|---|---|---|
| Tinta | `#0F1D2B` | Texto, estructura, botón principal, lateral del panel |
| Papel | `#EEF1EC` | Fondo |
| Hoja | `#FBFBF8` | Tarjetas |
| Maíz | `#F2B632` | Foco, acento, selección activa |
| Granada | `#B83226` | Errores y acciones destructivas |
| EME-E | `#3F549E` | Motivación |
| IPAA | `#008B8D` | Autorregulación |
| EAPESA | `#B46919` | Autoeficacia |
| PERMA | `#7E3857` | Bienestar |

Los cuatro colores de instrumento se validaron como paleta categórica (24-09-2026): ΔE2000 ≥ 15 con visión normal (mínimo 26,1) y ≥ 8 bajo protanopía, deuteranopía y tritanopía (Machado 2009, severidad 1; mínimos 15,8 / 16,5 / 17,1), y contraste ≥ 3:1 sobre la hoja (mínimo 4,0). El instrumento más cercano queda a ΔE 8,5 de granada y 9,0 de ok en la peor visión. Si se cambian, hay que volver a validarlos.

**Botón principal:** tinta con texto blanco (17:1). El maíz no lleva texto blanco (1,8:1): solo texto en tinta (9,4:1). **Foco:** anillo doble, tinta por dentro y maíz por fuera. El color refuerza, pero nunca reemplaza el texto: cada estado lleva etiqueta y cada serie tiene leyenda.

## Principios

1. Una pregunta, una tarjeta. En el celular las opciones se apilan y en el escritorio van en fila.
2. El PERMA mantiene su escala 0–10 en una fila con anclas en los extremos, como indica el instrumento.
3. Al responder por primera vez, la pantalla avanza sola al siguiente ítem pendiente.
4. El guardado se ve siempre al pie: "Guardado 14:32", o "Sin conexión · guardado en este dispositivo".
5. El envío pide confirmación y deja claro que es irreversible.

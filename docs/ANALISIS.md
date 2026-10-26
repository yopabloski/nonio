# Nonio · Análisis del panel docente

Solo se usan variables psicoeducativas: las notas y los datos académicos se analizan por separado.
Todos los cálculos se hacen en el navegador (`js/domain/estadistica.js`) y están validados contra R (psych, polycor, GPArotation) y scikit-learn en `tests/estadistica.test.mjs`.

## Filtros globales

- **Cohorte:** muestra una cohorte o todas. Cada participante queda marcado con la cohorte vigente cuando se registró (se configura en *Momentos → Cohorte actual*).
- **Excluir baja calidad:** quita de todas las vistas los cuestionarios marcados en la pestaña E. La exportación no cambia.

## Variables generales

| Variable | Puntaje | Escala |
|---|---|---|
| Motivación intrínseca | `EME_MI_Global` (media de las 3 subescalas de MI) | 1–7 |
| Autorregulación | `IPAA_Total` (12 ítems) | 1–5 |
| Autoeficacia | `EAPESA_Total_10items` | 1–4 |
| Bienestar | `PERMA_Global` (16 ítems) | 0–10 |

Si un instrumento se aplicó en más de un momento, se usa el envío más reciente.

## A · Foto de la cohorte

- Descriptivos de las 4 variables: n, M, DE, mediana, RIC, rango, asimetría y curtosis (tipo 2, como SPSS), y Shapiro-Wilk.
- Un boxplot por variable, cada uno en su escala.
- Boxplots de todas las dimensiones, por instrumento y momento.
- **Tendencias entre cohortes** (análisis transversal): media e IC 95 % por cohorte. Compara con ANOVA o con Kruskal-Wallis según la normalidad. Aparece cuando hay 2 o más cohortes.

## B · Por instrumento (momento × instrumento)

- Descriptivos y boxplot por dimensión.
- **Confiabilidad:** α de Cronbach, α ordinal (sobre correlaciones policóricas), ω de McDonald y ω ordinal (un factor, ejes principales iterados). Se marca en rojo si es menor que 0,70.
- **Análisis de ítems:** % en el valor mínimo y máximo (se marca sobre 15 %), correlación ítem-total corregida dentro de su dimensión (se marca bajo 0,30) y α si se elimina el ítem.
- Distribución de respuestas por ítem.
- **Correlaciones entre ítems:** ρ de Spearman, porque los ítems son ordinales.
- **AFE:** sobre la matriz policórica, suavizada si no es definida positiva.
  - Se reportan KMO y la prueba de Bartlett.
  - Análisis paralelo de Horn (percentil 95, 100 simulaciones), en versión factores y componentes.
  - Extracción por ejes principales con rotación oblimin (cuartimin directo).
  - Se puede elegir el número de factores.
- **Continuo de autodeterminación** (solo EME-E):
  - Correlación promedio según la distancia en el continuo.
  - ρ entre distancia y correlación (se espera negativo).
  - Correlación de Amotivación con las MI (se espera ≤ 0).
  - Veredicto: se cumple, se cumple parcialmente o no se cumple.

## C · Relaciones

- **Paramétrico o no paramétrico:**
  - A nivel de ítem siempre se usan métodos no paramétricos (Spearman o policóricas), porque las respuestas son discretas y ordinales.
  - Los puntajes de dimensión se tratan como continuos solo si todas las dimensiones pasan Shapiro-Wilk (α = 0,05). Si alguna no pasa, se usa Spearman.
- **Correlaciones entre dimensiones:** 18 dimensiones base (EME 7, IPAA 3, EAPESA 1, PERMA P-E-R-M-A-N-H). Se usan pares completos.
- **Red psicométrica:**
  - Correlaciones parciales, calculadas con la matriz inversa, entre las 18 dimensiones.
  - Solo entran estudiantes con los 4 instrumentos.
  - Se dibujan las aristas con p < 0,05 y |r| ≥ 0,10.
- **Regresión lineal múltiple** entre las variables generales. Se elige la variable a explicar y los predictores.
  - Reporta B, EE, β, t, p, VIF, R², R² ajustado y F.
  - Revisa la normalidad de los residuos.
  - Entrega un IC 95 % bootstrap (1.000 remuestreos), que es robusto aunque los residuos no sean normales.

## D · Perfiles y grupos

- **k-medias** sobre las 4 variables estandarizadas (z), con k = 2–5, k-means++ y 40 inicios.
  - Se sugiere el k con mayor silueta media.
  - Para cada grupo se muestra un gráfico de araña (medias como % de la escala), su tamaño y sus medias.
  - Las diferencias entre grupos se prueban con ANOVA o Kruskal-Wallis, con η² o ε².
  - La asignación (ID ↔ grupo) se descarga en CSV.
- **Perfil individual:** gráfico de araña del estudiante sobre la mediana y el 50 % central de la cohorte. Se muestran el puntaje, el % de la escala y el percentil. Usa el ID seudónimo por defecto.

> El consentimiento V4.0 dice que los datos no se usarán para identificar individualmente a los participantes. El perfil individual y los grupos son solo para investigación, no para intervenir a estudiantes puntuales.

## E · Calidad de respuesta

| Criterio | Umbral |
|---|---|
| Apresurada | < 2 s por ítem (Huang et al., 2012), medido entre la primera respuesta guardada y el envío |
| Plana | DE = 0 dentro del cuestionario (≥ 4 respuestas) |
| Secuencia repetida | Misma opción en ≥ 80 % de ítems consecutivos (mínimo 8) |
| Omisiones | > 20 % "Prefiero no responder" |

Los umbrales están en `UMBRALES_CALIDAD` (`js/domain/analitica.js`).

## Colores de los grupos

`#2a78d6 · #d9571f · #12996a · #4a3aa7 · #c9467f`. Es una paleta categórica validada (separación con daltonismo y contraste ≥ 3:1 sobre la hoja). Es distinta de los colores de instrumento para no confundir grupos con instrumentos, y siempre va con etiqueta.

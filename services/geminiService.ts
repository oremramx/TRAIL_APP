import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserInput, TrainingPlan, CoachInput } from "../types";

// Type guard to differentiate between runner and coach inputs
function isRunnerInput(input: UserInput | CoachInput): input is UserInput {
  return (input as UserInput).vamPace !== undefined;
}

const CROSS_TRAINING_PHILOSOPHY = `
**Filosofía y Reglas del Entrenamiento Cruzado (REGLA INQUEBRANTABLE Y FUNDAMENTAL):**
El Entrenamiento Cruzado (Cross Training) es una herramienta de apoyo, no el foco principal. Su aplicación debe seguir estas reglas estrictas para mantener la especificidad del plan.

1.  **Definición de Días de Entrenamiento:** El valor \`trainingDaysPerWeek\` se refiere **EXCLUSIVAMENTE a días de entrenamiento de CARRERA**. Cada semana DEBE tener exactamente este número de sesiones de carrera (excepto por la regla de sustitución en descarga). Los días restantes son días de descanso.

2.  **Estructura Semanal:**
    a. **Identifica los días de carrera:** Coloca las sesiones de carrera clave (series, tirada larga) y los rodajes suaves hasta completar el número de \`trainingDaysPerWeek\`.
    b. **Identifica los días de descanso:** Los días restantes de la semana son de descanso.

3.  **Aplicación del Entrenamiento Cruzado según la Fase Semanal:**
    - **Semanas de CARGA o IMPACTO (la mayoría de las semanas):**
      - En estas semanas, el entrenamiento cruzado es **OPCIONAL** y se realiza en los días de descanso para promover la recuperación activa.
      - Para los días de descanso en estas semanas, DEBES crear una \`DailySession\` con:
        - \`method\`: **"Descanso / Opcional"**.
        - \`details\`: Un texto claro que indique la opcionalidad. **Ejemplo para corredor:** "Descanso total o recuperación activa opcional. Si te sientes bien, elige una actividad de tu lista (ej. Ciclismo, Natación) durante 30-45 min a intensidad muy suave (Z1)." **Ejemplo para entrenador:** "Descanso total o recuperación activa opcional con ciclismo o natación suave."
        - \`duration\`: "N/A" o el tiempo opcional.
        - \`targetZone\`: "Z1 / Recuperación".
        - **No incluyas \`structuredSteps\` para estos días.**

    - **Semanas de DESCARGA o RECUPERACIÓN (típicamente cada 3ª o 4ª semana):**
      - En estas semanas, puedes **SUSTITUIR** uno de los entrenamientos de carrera de menor intensidad (típicamente un "Continuo Extensivo" o "Trail" suave) por una sesión de entrenamiento cruzado.
      - Esta sesión de sustitución SÍ cuenta como uno de los \`trainingDaysPerWeek\`.
      - La \`DailySession\` para esta sustitución debe tener:
        - \`method\`: **"Entrenamiento Cruzado"**.
        - \`duration\`: DEBE respetar \`normalDayDuration\`.
        - \`details\`: Debe ser específico. **Ejemplo para corredor:** "Sustituye a una carrera suave para reducir impacto. Elige una de tus actividades de la lista. Mantén una intensidad moderada-suave."
        - \`targetZone\`: "Z1-Z2".
        - **Crea un único paso en \`structuredSteps\` que represente toda la sesión.**

4.  **Días de Descanso Puro:**
    - En semanas de descarga, es muy recomendable que al menos un día de descanso sea puro, sin actividad opcional.
    - Crea una \`DailySession\` con: \`method: "Descanso"\`, \`duration: "0 min"\`, \`details: "Descanso total y recuperación."\`, \`targetZone: "N/A"\`. **No incluyas \`structuredSteps\`**.

5.  **Verificación Final Obligatoria:**
    - Revisa cada semana. ¿La suma de sesiones de "carrera" y "Entrenamiento Cruzado" (como sustituto) es igual a \`trainingDaysPerWeek\`?
    - ¿Los días de descanso en semanas de carga están etiquetados como "Descanso / Opcional"?
    - ¿Hay como máximo UNA sesión de "Entrenamiento Cruzado" (como sustituto) y SÓLO en las semanas de descarga?
`;

const DURATION_MANAGEMENT_PROMPT_BLOCK = `
**Gestión de Duración y Progresión (REGLA INQUEBRANTABLE Y CRÍTICA):**
La duración de las sesiones es un límite estricto impuesto por el usuario y NO DEBE ser violado bajo ninguna circunstancia.

1.  **Días Normales (Todos los días excepto la tirada larga):**
    - La duración de CADA sesión en un día normal DEBE ser EXACTAMENTE igual a \`normalDayDuration\`. No más, no menos.
    - La progresión en estas sesiones se logra AUMENTANDO LA INTENSIDAD (ej. series más rápidas, menos descanso), NO el tiempo.
    - Ejemplo: Si \`normalDayDuration\` es 60, la sesión DEBE ser de "60 min".

2.  **Día Largo (Tirada Larga):**
    - \`longRunDayDuration\` es el **tiempo MÁXIMO** para la tirada más larga del plan, que ocurre en las semanas pico, justo antes del tapering. NO es la duración para todas las semanas.
    - DEBES crear una **progresión lógica y gradual** en la duración de la tirada larga.
    - **Reglas de Progresión:**
        - **Inicio:** La primera tirada larga debe ser significativamente más corta que el máximo (p. ej., 60-70% de \`longRunDayDuration\`).
        - **Aumento:** Incrementa la duración gradualmente cada semana en los bloques de carga (ej. aumentar un 10-15%).
        - **Descarga:** Reduce la duración en las semanas de descarga (típicamente cada 4ª semana) a un nivel similar al de dos semanas antes.
        - **Pico:** Alcanza el \`longRunDayDuration\` en 1 o 2 semanas pico antes del tapering.
        - **Tapering:** Reduce drásticamente la duración durante la(s) semana(s) de tapering.
    - **Ejemplo de progresión para \`longRunDayDuration\` = 180 min en un plan de 12 semanas:**
        - Semana 1: 110 min
        - Semana 2: 125 min
        - Semana 3: 140 min
        - Semana 4 (Descarga): 115 min
        - Semana 5: 155 min
        - Semana 6: 170 min
        - Semana 7: 180 min (Pico)
        - Semana 8 (Descarga): 140 min
        - Semana 9: 180 min (Pico)
        - Semana 10: 150 min
        - Semana 11 (Taper): 90 min
        - Semana 12 (Taper): 60 min

3.  **Coherencia Interna (VERIFICACIÓN FINAL OBLIGATORIA):**
    - Para CADA \`DailySession\`, la suma de los minutos descritos en el campo \`details\` (calentamiento, series, enfriamiento, etc.) DEBE ser EXACTAMENTE igual al valor numérico del campo \`duration\`.
    - Ejemplo: Si \`duration\` es "90 min", los \`details\` DEBEN sumar 90 minutos (ej. "15 min cal + 60 min ritmo + 15 min enf"). NO puede ser "10 + 60 + 10" (suma 80).
    - **Para CADA \`DailySession\` con \`structuredSteps\`, la suma total de \`durationValue\` (en segundos) de todos los pasos DEBE ser EXACTAMENTE igual a la duración total de la sesión en segundos.**

4.  **Formato de Duración en Detalles (NÚMEROS ENTEROS):**
    - Al escribir los tiempos de los intervalos dentro de \`details\`, USA SIEMPRE NÚMEROS ENTEROS para los minutos.
    - **EVITA LOS DECIMALES A TODA COSTA.** Por ejemplo, nunca escribas "3.75 min".
    - Si necesitas más precisión, usa minutos y segundos, por ejemplo: "3 min 45 seg".
    - Es preferible que ajustes la estructura de la sesión (número de repeticiones, descansos, etc.) para que todos los intervalos sean en minutos enteros.
    - **Ejemplo INCORRECTO:** \`details: "15 min cal + 2 series de [ (3.75 min S Z3 + 3 min B Z2) x 2 ]..."\`
    - **Ejemplo CORRECTO:** \`details: "15 min cal + 2 series de [ (4 min S Z3 + 3 min B Z2) x 2 ]..."\` (ajustando otras partes para que la suma total siga siendo correcta).

**Esta es la regla más importante del plan. Un plan que no respeta la disponibilidad del usuario es inútil.**
`;

const INTERVAL_DESIGN_GUIDELINES = `
**Guía de Diseño de Intervalos (REGLA DE REALISMO FISIOLÓGICO):**
Al crear los detalles de las sesiones fraccionadas (\`details\`), la duración y la intensidad de los intervalos DEBEN ser fisiológicamente realistas y estar inversamente correlacionadas, especialmente en cuesta. **Esto es CRÍTICO para la credibilidad y seguridad del plan.**

**1. Guía Detallada para Entrenamientos en Cuesta (S) - REGLA OBLIGATORIA:**
La relación entre duración e intensidad en cuesta es INVERSA. Intervalos más largos DEBEN tener una intensidad significativamente menor. Usa esta tabla como una regla matemática estricta e inquebrantable:

*   **Cuestas Muy Cortas y Explosivas (Potencia / VAM):**
    *   **Duración:** 30 segundos a 2 minutos.
    *   **Intensidad:** **Z3+** (VAM).
    *   **RPE:** 9-10.
    *   **Ejemplo Válido:** \`10 x 45 seg S Z3+ con rec. bajando al trote.\`

*   **Cuestas Medias (Supra-Umbral y Umbral):**
    *   **Sub-categoría 1 (Cortas de Supra-Umbral):**
        *   **Duración:** 3 a 5 minutos.
        *   **Intensidad:** **Z3** (Supra-Umbral).
        *   **RPE:** 8.
        *   **Ejemplo Válido:** \`5 x 4 min S Z3 con rec. activa de igual duración.\`
    *   **Sub-categoría 2 (Largas de Umbral):**
        *   **Duración:** 6 a 15 minutos.
        *   **Intensidad:** **Z2+** (Umbral Anaeróbico / UAN).
        *   **RPE:** 6-7.
        *   **Ejemplo Válido:** \`3 x 10 min S Z2+ con 4 min rec. en llano.\`

*   **Cuestas Largas (Tempo / Resistencia):**
    *   **Duración:** 15 a 25 minutos (o más en bloques).
    *   **Intensidad:** **Z2** (Tempo).
    *   **RPE:** 5-6.
    *   **Ejemplo Válido:** \`2 x 20 min S Z2 con 5 min rec. en llano.\`

**Reglas de Duración de la Recuperación (REGLA INQUEBRANTABLE):**
La duración de la recuperación (rec.) es tan importante como el estímulo. DEBES seguir estas proporciones (ratio Esfuerzo:Recuperación) para garantizar la efectividad fisiológica de cada sesión. Una recuperación excesivamente larga anula el propósito del entrenamiento.

*   **Para Cuestas/Intervalos Z3+ (VAM):**
    *   **Ratio:** 1:1 a 1:2 (ej. 1 min esfuerzo, 1-2 min rec.).
    *   **Ejemplo Válido:** \`8 x 2 min S Z3+ con 2 min rec. trote.\`

*   **Para Cuestas/Intervalos Z3 (Supra-Umbral):**
    *   **Ratio:** 1:1 (ej. 4 min esfuerzo, 4 min rec.).
    *   **Ejemplo Válido:** \`5 x 4 min S Z3 con 4 min rec. activa.\`
    *   **Ejemplo INCORRECTO (Y ESTRICTAMENTE PROHIBIDO):** \`6 x 3 min S Z3 con 7 min rec.\` (El ratio es casi 1:2.5. Para Z3, debería ser 1:1).

*   **Para Cuestas/Intervalos Z2+ (Umbral):**
    *   **Ratio:** 2:1 a 4:1 (ej. 8 min esfuerzo, 2-4 min rec.).
    *   **Ejemplo Válido:** \`3 x 10 min S Z2+ con 3 min rec. en llano.\`

*   **Para Cuestas/Intervalos Z2 (Tempo):**
    *   **Ratio:** 4:1 a 5:1 (ej. 20 min esfuerzo, 4-5 min rec.).
    *   **Ejemplo Válido:** \`2 x 20 min S Z2 con 4 min rec. en llano.\`

**La recuperación al bajar la cuesta trotando/caminando es una forma válida de medir el tiempo, siempre y cuando se ajuste aproximadamente a estos ratios.** Por ejemplo, para un intervalo de 1 minuto en Z3+, bajar la misma cuesta al trote probablemente tomará entre 1 y 2 minutos, lo cual es un ratio perfecto. Pero para un intervalo de 3 minutos en Z3, la bajada no debería tomar 7 minutos. **DEBES ser lógico.**


*   **VERIFICACIÓN FINAL Y OBLIGATORIA PARA CUESTAS (LA MÁS IMPORTANTE):**
    - Antes de generar la respuesta final, DEBES realizar una verificación de cada intervalo en cuesta ('S').
    - **Para cada intervalo 'S', comprueba su duración y asigna la intensidad EXACTA que dicta la tabla. NO HAY EXCEPCIONES, incluso en métodos modelados complejos.**
    - **EJEMPLOS DE LO QUE ESTÁ ESTRICTAMENTE PROHIBIDO (Y CÓMO CORREGIRLO):**
        *   \`INCORRECTO: "4 min S en Z3+"\` (Error. 4 min está en el rango de 3-5 min, la intensidad DEBE ser Z3).
        *   \`INCORRECTO: "7 min S en Z3"\` (Error. 7 min está en el rango de 6-15 min, la intensidad DEBE ser Z2+).
        *   \`INCORRECTO: "10 min S en Z3"\` (Error. 10 min está en el rango de 6-15 min, la intensidad DEBE ser Z2+).
        *   \`INCORRECTO: "20 min S en Z2+"\` (Error. 20 min está en el rango de 15-25 min, la intensidad DEBE ser Z2).
    - **Tu credibilidad como entrenador depende de aplicar esta regla correctamente. Un intervalo de 7 minutos en Z3 es un error grave.**

**2. Guía para Intervalos en Llano (LL):**
*   **Z3+ / Z4 (VAM / Capacidad Anaeróbica):**
    *   **Duración:** 1 a 5 minutos máximo.
    *   **Dependencia del Nivel:** Usar duraciones más cortas (1-3 min) para principiantes y más largas (3-5 min) para avanzados.
*   **Z3 (Supra-Umbral):**
    *   **Duración:** 5 a 10 minutos. Intervalos más largos son para corredores avanzados con recuperaciones adecuadas.
*   **Z2 / Z2+ (Tempo / Umbral):**
    *   **Duración:** Se pueden realizar en bloques largos de 10 a 30 minutos o como un rodaje continuo a ese ritmo.

**3. VERIFICACIÓN FINAL:** Antes de finalizar la sesión, comprueba: ¿Es la combinación de duración e intensidad propuesta realista y segura para el nivel del corredor, especialmente en cuestas?
`;

const SESSION_NAMING_GUIDELINES = `
**Regla de Nomenclatura de Sesiones (CLARIDAD PARA EL USUARIO):**
- Para cualquier sesión de baja intensidad (Z1-Z2) que se deba realizar en terreno de trail (no asfalto), como los rodajes suaves o las tiradas largas, el campo \`method\` DEBE ser "Trail". Esto anula el nombre genérico "Continuo Extensivo" para dar mayor claridad al usuario.
- **Ejemplo:** Una tirada larga de 90 minutos en Z1+ en la montaña debe ser: \`method: "Trail"\`, no \`method: "Continuo Extensivo"\`.
- Mantén "Continuo Extensivo" solo para rodajes en terreno fácil o no especificado.
`;

const REFERENCE_TABLES = `
**TABLA DE ZONAS DE ENTRENAMIENTO A UTILIZAR:**
| Zona | Denominación/Hito      | % VAM | % FCmáx | % UAN | RPE   | Notas Adicionales |
|------|------------------------|-------|---------|-------|-------|-------------------|
| Z1   | Recuperación/Base      | 60%   | 70%     | 70%   | 1-2   |                   |
| Z1+  | UAE                    | 70%   | 80%     | 80%   | 3-4   | 100% VT1          |
| Z2   | Tempo                  | 80%   | 85%     | 90%   | 5-6   |                   |
| Z2+  | UAN                    | 85%   | 90%     | 100%  | 6-7   | 100% VT2          |
| Z3   | Supra                  | 92%   | 95%     | 110%  | 8     |                   |
| Z3+  | VAM                    | 100%  | 100%    | 120%  | 9-10  | VO2MAX            |
| Z4   | Capacidad Anaeróbica   | 120%  | -       | 140%  | -     |                   |
| Z5   | Potencia Anaeróbica    | 140%  | -       | 160%  | -     |                   |
| Z6   | Potencia Anaeróbica Aláctica | 160% | - | 180% | - |                   |

**PERIODIZACIÓN POR TIPO DE CARRERA:**
| TIPO DE CARRERA | FASE I (BASE)                                       | FASE II (ESPECÍFICO-COMPETICIÓN)                                                                 | FASE III (TAPERING)                              |
|-----------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------|--------------------------------------------------|
| **VERTICAL**    | Base aeróbica con introducción temprana de cuestas. | **Énfasis masivo en VAM y fuerza de ascenso.** Mayoría de sesiones son en cuesta.                | Mantener intensidad en cuesta, reducir volumen.  |
| CORTA           | Mejorar base aeróbica, ent. continuo                | Mejorar UAN y después VO2max. Intervalos: Largo -> Medio -> Corto.                               | Afinamiento, bajar volumen 40-60%                |
| MEDIA           | Mejorar base aeróbica, ent. continuo                | Mejorar VO2max y después UAN. Intervalos: Corto -> Medio -> Largo.                               | Afinamiento, bajar volumen 40-60%                |
| LARGA / ULTRA   | Mejorar VO2max y después UAN. Int: Corto->Largo       | Mejorar resistencia a la fatiga. Continuo largo y muy largo. Recordatorios de alta intensidad. | Afinamiento, bajar volumen 40-60%                |

**MÉTODOS DE ENTRENAMIENTO (La Caja de Herramientas del Entrenador):**
- **1. MÉTODOS AISLADOS (Para la Fase Base):** Desarrollan una única cualidad. Son estímulos puros y simples.
  - **Tipos:** "Trail", "Continuo Extensivo", "Continuo Intensivo", "Fraccionado en Subida", "Fraccionado en Llano", "Progresivo", "Entrenamiento Cruzado" (solo como sustituto en descarga).
- **2. MÉTODOS DE APROXIMACIÓN Y COMBINADOS (Para la Fase Específica/Competición):** Simulan las demandas reales de la competición. Son CRÍTICOS para el trail.
  - **"Fraccionado Modelado":** Sesiones que imitan la orografía de la carrera alternando subidas (S), bajadas (B) y llanos (LL) de formas variadas y creativas para romper la monotonía.
    - **Ejemplos de Estructuras (USA ESTOS PATRONES PARA INSPIRARTE Y CREAR VARIEDAD):**
      - **Clásico (S+B):** Fraccionado simple de subida y bajada. Ej: 4 x (5 min S Z3 + 3 min B controlada).
      - **Completo (S+B+LL):** Simula una cuesta completa con llano posterior. Ej: 3 x (5 min S Z3 + 3 min B Z2 + 5 min LL Z2).
      - **Ondulado (S+B)xN:** Simula un terreno "rompepiernas". Ej: 2 series de [ (4 min S Z3 + 2 min B Z2) x 2 ].
      - **Pirámide en Cuesta:** Variar la duración de las subidas. Ej: 2-4-6-4-2 minutos de subida (S Z3) con recuperación bajando.
      - **Bloques con Cambio de Intensidad:** Simula un apretón en media subida. Ej: 2 x (8 min S Z2 continuo + 2 min S Z3 final).
      - **Simulación de Cresta (S+LL+S+B):** Subir a una cresta, correr por ella y bajar. Ej: 5 min S Z3 + 4 min LL Z2 + 3 min S Z3 + 4 min B Z2.
  - **"Trail Modelado":** Sesión realizada en un terreno que simula el perfil exacto de la carrera, o incluso en el propio recorrido. Es un esfuerzo continuo que busca replicar tramos largos de la competición, prestando atención a la técnica, nutrición y gestión del esfuerzo.
  - **"Resistencia a la Fatiga: Bloques":** Entrenamiento donde los bloques de intensidad se realizan al final de un rodaje.
  - **"Back-to-Back":** Dos entrenamientos de volumen significativo en días consecutivos. **REGLA:** El campo \`details\` del segundo día DEBE incluir una nota didáctica. Ejemplo: "...Día 2 del B2B, el objetivo es correr con fatiga acumulada."
  - **"Trail Variable" o "Continuo Variable > VT2":** Cambios de ritmo no estructurados o estructurados en una tirada larga.
  - **"Recordatorio de Ritmo (Modelado Corto)":** Sesión corta en la fase de Tapering para mantener la chispa.

**GUÍA DE ENTRENAMIENTO DE FUERZA (resumir en \`complementaryTasks.strength\`):**
- **Fase 1 - Fuerza general (60–65% RM):** Sentadillas, peso muerto, hip thrust, flexiones. Pliometría: saltos, puntillas.
- **Fase 2 - Fuerza máxima (75–90% RM):** Ejercicios con carga, subidas, isometrías. Pliometría: saltos múltiples, reactividad.
- **Fase 3 - Unilateral y fuerza explosiva (55–60% RM):** Ejercicios monopodales y con vuelo. Pliometría: cajón monopodal, tijeras.
- **Fase 4 - Fuerza específica y transferencias:** Pesos + subida al cajón, cuestas. Pliometría: drop jump, triple salto.
- **Componente Excéntrico:** Integrar en todas las fases con foco progresivo. Ej: aterrizajes controlados, drop jumps.
`;

const ELEVATION_PROGRESSION_GUIDELINES = `
**Progresión de Desnivel en Tiradas Largas (REGLA DE MÁXIMA ESPECIFICIDAD):**
Para CUALQUIER tipo de carrera que no sea 'Vertical', esta regla es OBLIGATORIA.

1.  **Cálculo del Ratio Objetivo:** Primero, calcula el ratio de desnivel de la carrera objetivo (ej: 1200m / 25km = 48 m/km). Este es tu objetivo para las semanas pico.

2.  **Progresión Obligatoria:** En CADA sesión de 'Tirada Larga' (método 'Trail'), DEBES incluir el campo \`trailElevation\` con un valor de desnivel objetivo.
    - **Fase Base:** Comienza con un desnivel significativamente MENOR que el ratio de la carrera (ej: 50-60% del ratio objetivo).
    - **Fase Específica:** Aumenta el desnivel de forma PROGRESIVA y LÓGICA cada semana de carga.
    - **Semanas Pico:** El desnivel en las tiradas largas pico (justo antes del Tapering) DEBE ser igual o ligeramente superior (hasta un 10% más) al ratio de la carrera.
    - **Semanas de Descarga y Tapering:** Reduce el desnivel junto con la duración.

3.  **Ejemplo de Progresión (Ratio Objetivo 48 m/km, tirada de 15km):**
    - Objetivo Pico: 15km * 48 m/km = 720m de desnivel.
    - Semana Base 1 (10km): \`trailElevation: "Desnivel: ~300m"\` (Ratio 30m/km)
    - Semana Específica 5 (15km): \`trailElevation: "Desnivel: ~600m"\` (Ratio 40m/km)
    - Semana Pico 9 (18km): \`trailElevation: "Desnivel: ~900m"\` (Ratio 50m/km, igualando el objetivo)

**Esta regla es CRÍTICA. Un plan de trail sin progresión de desnivel está incompleto.**
`;

const PLAN_STRUCTURE_CALCULATION = `
**Cálculo de la Estructura y Periodización del Plan (REGLA INQUEBRANTABLE)**
Debes calcular la duración de cada fase de forma precisa y algorítmica. NO te desvíes de estos pasos.

1.  **Determinar la Duración del Tapering (\`taper_weeks\`):**
    - **REGLA ESTRICTA:** Basa la duración del tapering EXCLUSIVAMENTE en el \`raceType\`.
      - **Ultra y Larga:** \`taper_weeks\` = **2**.
      - **Media, Corta, Muy Corta y Vertical:** \`taper_weeks\` = **1**.
    - Anota este número. Ejemplo para carrera Larga: \`taper_weeks\` = 2.

2.  **Calcular las Semanas Restantes para Entrenamiento (\`training_weeks\`):**
    - \`training_weeks\` = \`weeksToRace\` - \`taper_weeks\`.
    - Ejemplo: \`16 - 2 = 14\`.

3.  **Determinar la Duración de la Fase Base (\`base_weeks\`):**
    - Si \`weeksToRace\` > 10: \`base_weeks\` = \`round(training_weeks * 0.4)\`. (Redondea al entero más cercano).
    - Si \`weeksToRace\` <= 10: \`base_weeks\` es menor, entre el 20-30% de \`training_weeks\`, o incluso 0 si el plan es muy corto (<6 semanas), fusionándose con la fase específica.
    - Ejemplo para plan > 10 semanas: \`round(14 * 0.4)\` da como resultado 6. \`base_weeks\` = 6.

4.  **Determinar la Duración de la Fase Específica (\`specific_weeks\`):**
    - \`specific_weeks\` = \`training_weeks\` - \`base_weeks\`.
    - Ejemplo: \`14 - 6 = 8\`. \`specific_weeks\` = 8.

5.  **Asignar Fases a las Semanas:**
    - Asigna las fases en orden cronológico:
      - Semanas 1 hasta \`base_weeks\`: Fase "Base".
      - Siguientes \`specific_weeks\`: Fase "Específico".
      - Últimas \`taper_weeks\`: Fase "Tapering".
    - Ejemplo (Plan de 16 semanas para carrera Larga):
      - Semanas 1-6: Base
      - Semanas 7-14: Específico
      - Semanas 15-16: Tapering
    - **Verificación Final:** La suma DEBE ser \`weeksToRace\`. \`6 + 8 + 2 = 16\`. Correcto.

**APLICACIÓN DE ESTA LÓGICA:**
- Inmediatamente después de determinar el \`runnerProfile\`, realiza este cálculo y úsalo para estructurar el array \`weeklySchedules\`. Las siguientes reglas de contenido de fase se aplican DESPUÉS de haber definido la duración de cada fase con este método.
`;


const getRunnerPrompt = (userInput: UserInput): string => {
    // Definición de las interfaces como texto para el prompt
    const jsonSchema = `
    interface TrainingPlan {
      planSummary: string;
      runnerProfile: {
        level: string; // Principiante, Intermedio, Avanzado
        needs?: string; // Mejorar VAM, Mejorar UAN, Mixto. Optional field.
        raceType: string; // Vertical, Muy Corta, Corta, Media, Larga, Ultra
      };
      trainingZones: TrainingZone[];
      weeklySchedules: WeeklySchedule[];
      complementaryTasks: {
        strength: string;
        mobility: string;
      };
      raceProfileAdaptations: string;
      controlMetrics: ControlMetrics;
      glossary?: GlossaryTerm[];
    }
    
    interface GlossaryTerm {
        term: string; // The technical term used in the plan
        definition: string; // A clear and concise definition of the term
    }

    interface TrainingZone {
      zone: string; // e.g., "Z1", "Z2"
      name: string; // e.g., "Recuperación", "Tempo"
      vamRange: string; // Percentage value from the reference table, e.g., "70% VAM"
      paceRange: string; // e.g., "6:15-5:45 min/km"
      fcRange: string; // e.g., "120-140 ppm"
      rpe: string; // e.g., "3-4"
    }

    interface WeeklySchedule {
      week: number;
      phase: string; // Base, Específico, Tapering
      focus: string;
      sessions: DailySession[];
      summary: string;
    }

    interface WorkoutStep {
      stepName: string; // e.g., "Calentamiento", "Serie 1/4", "Recuperación", "Enfriamiento"
      durationValue: number; // Duration in SECONDS
      targetType: 'pace_zone' | 'hr_zone' | 'open';
      targetValue: string; // e.g., "Z1-Z2", "Z3", "Recuperación activa"
    }

    interface DailySession {
      day: string; // "Lunes", "Martes", etc.
      method: string; // e.g., "Fraccionado Largo", "Continuo Extensivo", "Descanso"
      duration: string; // e.g., "60 min", "2h 15min", "0 min"
      details: string; // Descripción del entrenamiento, ej: "Calentamiento + 4x6min con 3min rec."
      targetZone: string; // Objetivo de intensidad, ej: "Ritmo: 4:00-4:15 min/km | RPE 8-9", "N/A"
      trailElevation?: string; // e.g., "Desnivel: 450m"
      structuredSteps?: WorkoutStep[]; // OBLIGATORIO para todas las sesiones que no sean de descanso
    }
    
    interface ControlMetrics {
        elevationRatio: string; // m/km
        elevationRatioPerHour: string; // m/h
        weeklyVolume: string;
        accumulatedIntensity: string;
    }
    `;

    const defaultMethodology = `
    **LÓGICA GENERAL Y METODOLOGÍA (SEGUIR ESTRICTAMENTE PASO A PASO):**

    Sigue este flujo lógico para generar el plan de entrenamiento. Usa la información de las tablas y definiciones de referencia proporcionadas al final.

    **Flujo Lógico del Proceso:**

    **Paso 1: Entrada de Datos del Usuario**
    - Los datos del usuario se proporcionan en el objeto JSON. Analízalos para entender el perfil y objetivo. El objeto puede incluir un \`raceProfileImage\` que es la imagen del perfil de la carrera.

    **Paso 2: Cálculos Iniciales y Clasificación del Perfil (runnerProfile)**
    a) **Coeficientes de Desnivel (controlMetrics):**
       - Coeficiente por km: Desnivel total (m) / Distancia (km). Guárdalo en \`elevationRatio\`.
       - Coeficiente por hora: Desnivel total (m) / Tiempo estimado (horas). Guárdalo en \`elevationRatioPerHour\`.

    b) **Nivel del Corredor (runnerProfile.level):**
       - Determina el nivel según el ritmo VAM del usuario:
         - **Principiante:** VAM de 4:40 min/km o más lento.
         - **Intermedio:** VAM entre 4:30 y 3:20 min/km.
         - **Avanzado:** VAM más rápido de 3:20 min/km.

    c) **Demanda de Competición (runnerProfile.raceType):**
       - **PRIMERO, CHEQUEO DE CARRERA VERTICAL:**
         - Si el \`elevationRatio\` calculado en el paso 2a es **superior a 150 m/km**, clasifica la carrera como **"Vertical"**. Este es el caso más importante y anula las demás clasificaciones.
       - **SI NO ES VERTICAL, clasifica la prueba según su distancia y duración:**
         - Ultra (>42k o >5h 30'), Larga (26-42k o 3h a 5h30'), Media (16-25k o 2h – 3h 30'), Corta (5-15k o 1 hora - 2h 30 minutos), Muy corta (2-5k o 15-50 minutos).

    d) **Necesidades del Corredor (runnerProfile.needs):**
       - Compara el ritmo UAN con el 85% del VAM para evaluar el perfil fisiológico.
         - **Si UAN > 85% VAM (más lento):** Necesidad de mejorar UAN.
         - **Si UAN < 85% VAM (más rápido):** Necesidad de mejorar VAM.
         - **Si UAN ≈ 85% VAM:** Trabajar ambas (mixto).

    **Paso 3: Definición de Zonas de Entrenamiento Personalizadas (trainingZones)**
    - Utilizando los datos de VAM, UAN y FC Máxima del usuario, define 6 zonas de entrenamiento específicas (Z1 a Z3+).
    - Basa los rangos de intensidad en la tabla de referencia "TABLA DE ZONAS DE ENTRENAMIENTO A UTILIZAR". Expresa los rangos de FC y ritmo de forma clara y calculada.
    - Adicionalmente, rellena el campo \`vamRange\` con el valor de porcentaje correspondiente de la tabla de referencia (ej: "60% VAM").
    
    **Paso 4: ESTRUCTURA SEMANAL Y PERIODIZACIÓN**
    
    ${PLAN_STRUCTURE_CALCULATION}

    Ahora, con las duraciones de las fases ya definidas, procede a rellenar el contenido de cada semana siguiendo estas reglas:

    ${CROSS_TRAINING_PHILOSOPHY}

    - **CONTENIDO PARA LA FASE BASE:**
      - **Objetivo:** Construir la base aeróbica y fortalecer fundamentos.
      - **REGLA DE ASIGNACIÓN DE MÉTODOS:** Para CADA sesión de CARRERA en esta fase, el campo \`method\` DEBE ser uno de los **MÉTODOS AISLADOS** (ej. "Continuo Extensivo", "Fraccionado en Subida"). No combines estímulos.
      - **Foco Fisiológico:** Según la tabla de Periodización (Para Larga/Ultra, mejorar VAM/VO2max; para Media/Corta, mejorar UAE-VT1).
      
    - **CONTENIDO PARA LA FASE ESPECÍFICA:**
      - **Objetivo:** Simular la competición y mejorar los factores limitantes.
      - **REGLA DE ASIGNACIÓN DE MÉTODOS:** Para las sesiones de intensidad en esta fase, el campo \`method\` DEBE ser uno de los **MÉTODOS DE APROXIMACIÓN o COMBINADOS**. **DEBES variar estas estructuras y métodos entre las semanas de la fase específica para evitar la monotonía y proporcionar un estímulo de entrenamiento más completo y dinámico.**
      - **Selección de Método según Tipo de Carrera:**
        - **Vertical:** El plan DEBE estar dominado por "Fraccionados en subida".
        - **Larga/Ultra:** El foco es la **Resistencia a la Fatiga**. Usa métodos como "Back-to-Back", "Resistencia a la Fatiga: Bloques" y "Trail Variable". Incluye la estrategia "CACO" en los \`details\`.
        - **Media/Corta:** El foco es la **Simulación de Competición**. Usa "Fraccionado Modelado" y "Trail Modelado". Nombra el método claramente (ej. \`method: "Fraccionado Modelado (S+B)"\`).

    - **CONTENIDO PARA LA FASE DE TAPERING:**
      - **Objetivo:** Reducir fatiga, maximizar la supercompensación y llegar fresco a la carrera.
      - **REGLA DE ASIGNACIÓN DE MÉTODOS:** Usa versiones de bajo volumen de los **MÉTODOS COMBINADOS**. El \`method\` debe ser algo como "Recordatorio de Ritmo (Modelado Corto)".
      - **Volumen y Intensidad:** Reduce el volumen total (ej. 40-60% menos que el pico), pero mantén 1 o 2 picos cortos de intensidad de carrera (ej. 2x3 min a ritmo de carrera) al principio de la semana de la carrera.


    **Paso 4.5: ANÁLISIS DEL PERFIL DE LA CARRERA (SI SE PROPORCIONA IMAGEN)**
    - **Si se proporciona una imagen del perfil de la carrera, esta es una tarea de MÁXIMA PRIORIDAD.** Analiza la imagen en detalle.
    - **Identifica:** Subidas clave (ubicación, longitud), bajadas (técnicas/rápidas), distribución del desnivel.
    - **Acción CRÍTICA:** Utiliza esta información para que los entrenamientos de la Fase Específica sean extremadamente relevantes. Prioriza el método "Trail Modelado" o "Fraccionado Modelado" para simular el terreno.
      - **Ejemplo:** Si ves una subida monstruosa y larga en los kilómetros finales, DEBES incluir entrenamientos de "Resistencia a la Fatiga: Bloques" que simulen específicamente ese esfuerzo tardío.
    - **Acción Adicional:** Menciona explícitamente cómo has adaptado el plan al perfil en el campo \`raceProfileAdaptations\`. Por ejemplo: "El plan incluye bloques de cuestas al final de las tiradas largas para simular la subida clave del km 32 que se observa en el perfil."

    **Paso 5: Detalle de Sesiones (Y PASOS ESTRUCTURADOS - CRÍTICO)**
    
    ${DURATION_MANAGEMENT_PROMPT_BLOCK}

    ${INTERVAL_DESIGN_GUIDELINES}
    
    ${SESSION_NAMING_GUIDELINES}

    ${ELEVATION_PROGRESSION_GUIDELINES}

    - **Regla de Oro para la Intensidad (MÁXIMA PRIORIDAD):**
      - **Terreno LLANO/NO-ESPECÍFICO (asfalto):** La \`targetZone\` DEBE basarse en el RITMO (ej: "Ritmo: 4:00-4:15 min/km | RPE 8-9").
      - **Terreno ESPECÍFICO (trail, cuestas):** El ritmo no es fiable. La \`targetZone\` DEBE basarse en RPE o FC (ej: "Subidas en Z4 | RPE 8-9 | FC ~170ppm").
      - **Baja/Media Intensidad (rodajes):** Usa una combinación flexible de Zonas de FC, RPE y ritmo (ej: "Zona Z1+ | RPE 3-4").

    - **Regla de Pasos Estructurados (\`structuredSteps\`) - TAREA OBLIGATORIA:**
      - Para **CADA** \`DailySession\` que no sea un día de descanso total, **DEBES** rellenar el array \`structuredSteps\`.
      - Este array es una traducción legible por máquina del campo \`details\`.
      - **Desglosa** la sesión en sus componentes lógicos (calentamiento, series, recuperaciones, enfriamiento, etc.).
      - **Duración:** \`durationValue\` DEBE estar en **SEGUNDOS**. La suma de todos los \`durationValue\` del array DEBE ser igual a la duración total de la sesión en segundos.
      - **Objetivo:** \`targetValue\` debe ser una zona (ej: "Z3", "Z1") o un texto descriptivo (ej: "Trote muy suave").
      - **Ejemplo de Traducción:**
        - \`details: "15 min cal. + 3x(5 min Z3 + 3 min Z1) + 6 min enf."\` (Duración total: 45 min = 2700s)
        - Se convierte en:
        - \`structuredSteps: [\`
        - \`  { "stepName": "Calentamiento", "durationValue": 900, "targetType": "hr_zone", "targetValue": "Z1" },\`
        - \`  { "stepName": "Serie 1/3", "durationValue": 300, "targetType": "hr_zone", "targetValue": "Z3" },\`
        - \`  { "stepName": "Recuperación 1/3", "durationValue": 180, "targetType": "hr_zone", "targetValue": "Z1" },\`
        - \`  { "stepName": "Serie 2/3", "durationValue": 300, "targetType": "hr_zone", "targetValue": "Z3" },\`
        - \`  { "stepName": "Recuperación 2/3", "durationValue": 180, "targetType": "hr_zone", "targetValue": "Z1" },\`
        - \`  { "stepName": "Serie 3/3", "durationValue": 300, "targetType": "hr_zone", "targetValue": "Z3" },\`
        - \`  { "stepName": "Recuperación 3/3", "durationValue": 180, "targetType": "hr_zone", "targetValue": "Z1" },\`
        - \`  { "stepName": "Enfriamiento", "durationValue": 360, "targetType": "hr_zone", "targetValue": "Z1" }\`
        - \`]\`

    **Paso 6: Tareas Complementarias y Métricas de Control**
    a) **Tareas Complementarias (complementaryTasks):** Basado en la fase del plan, prescribe trabajo de fuerza y movilidad siguiendo la "GUÍA DE ENTRENAMIENTO DE FUERZA". Sé conciso.
    b) **Adaptaciones Específicas (raceProfileAdaptations):** Escribe una frase corta resumiendo cómo el plan se adapta al perfil de la carrera.
    c) **Resumen de Métricas (controlMetrics):** Resume la progresión de volumen e intensidad.
       
    **Paso 7: Glosario de Términos (glossary) - OBLIGATORIO**
    - Escanea el plan en busca de términos técnicos (CACO, Back-to-Back, etc.) y defínelos en el glosario. SIEMPRE incluye los que uses.
    - **Definiciones a utilizar:**
        - **CACO (Caminar-Correr):** "Estrategia que alterna deliberadamente segmentos de carrera con caminata rápida, especialmente en subidas empinadas, para conservar energía y mantener un ritmo general sostenible en carreras largas."
        - **Back-to-Back:** "Dos entrenamientos de volumen significativo realizados en días consecutivos para simular la fatiga de las últimas etapas de una ultra. El objetivo es enseñar al cuerpo a rendir con cansancio."
        - **Resistencia a la Fatiga: Bloques:** "Entrenamiento donde los bloques de intensidad se realizan al final de un rodaje, para enseñar al cuerpo a rendir con las reservas de energía bajas."


    **--- DEFINICIONES Y TABLAS DE REFERENCIA ---**
    ${REFERENCE_TABLES}
    `;
    
    // We don't stringify the user input here because the image data can be large
    // The caller will handle assembling the final prompt parts
    return `
    Eres un entrenador experto de trail running de clase mundial. Tu tarea es generar un plan de entrenamiento completo y personalizado en formato JSON para el usuario proporcionado.
    Debes seguir ESTRICTAMENTE la metodología y la estructura JSON que te proporciono. No inventes campos ni te desvíes de la lógica.

    **REGLA CRÍTICA DE FORMATO:** El output DEBE ser un único bloque de código JSON válido. Asegúrate de que todas las cadenas de texto dentro del JSON estén correctamente escapadas (por ejemplo, usar \\" para comillas dentro de una cadena). Revisa dos veces que no falten comas entre los elementos de los objetos o arrays, y que todos los corchetes y llaves estén correctamente cerrados. Un JSON mal formado es inaceptable.

    **ESTRUCTURA JSON DE SALIDA:**
    ${jsonSchema}

    **METODOLOGÍA DE ENTRENAMIENTO DETALLADA:**
    ${defaultMethodology}

    **DATOS DEL USUARIO:**
    ${JSON.stringify({ ...userInput, raceProfileImage: 'IMAGE_PROVIDED_SEPARATELY' }, null, 2)}

    Ahora, basándote en todo lo anterior, genera el objeto JSON \\\`TrainingPlan\\\` completo y válido.
    `;
}

const getCoachPrompt = (userInput: CoachInput): string => {
    const jsonSchema = `
    interface TrainingPlan {
      planSummary: string;
      runnerProfile: {
        level: string; // Principiante, Intermedio, Avanzado
        needs?: string; // THIS FIELD SHOULD BE OMITTED
        raceType: string; // Vertical, Muy Corta, Corta, Media, Larga, Ultra
      };
      trainingZones: TrainingZone[];
      weeklySchedules: WeeklySchedule[];
      complementaryTasks: {
        strength: string;
        mobility: string;
      };
      raceProfileAdaptations: string;
      controlMetrics: ControlMetrics;
      glossary?: GlossaryTerm[];
    }
    
    interface GlossaryTerm {
        term: string;
        definition: string;
    }

    interface TrainingZone {
      zone: string;
      name: string;
      vamRange: string; // CRITICAL: Must be in format "% VAM", e.g., "70% VAM"
      paceRange: string; // Should be "N/A"
      fcRange: string; // CRITICAL: Must be in format "%FCmáx", e.g., "80% FCmáx"
      rpe: string;
    }

    interface WeeklySchedule {
      week: number;
      phase: string;
      focus: string;
      sessions: DailySession[];
      summary: string;
    }

     interface WorkoutStep {
      stepName: string; // e.g., "Calentamiento", "Serie 1/4", "Recuperación", "Enfriamiento"
      durationValue: number; // Duration in SECONDS
      targetType: 'pace_zone' | 'hr_zone' | 'open';
      targetValue: string; // e.g., "Z1-Z2", "Z3", "Recuperación activa"
    }

    interface DailySession {
      day: string;
      method: string;
      duration: string;
      details: string;
      targetZone: string; // CRITICAL: MUST follow the format "%VAM | %FCmáx | RPE" or "N/A"
      trailElevation?: string;
      structuredSteps?: WorkoutStep[]; // OBLIGATORIO para todas las sesiones que no sean de descanso
    }
    
    interface ControlMetrics {
        elevationRatio: string; // m/km or generic text
        elevationRatioPerHour: string; // "N/A" or generic text
        weeklyVolume: string;
        accumulatedIntensity: string;
    }
    `;

    const coachMethodology = `
    **LÓGICA GENERAL PARA PLANES GENÉRICOS (SEGUIR ESTRICTAMENTE):**

    Tu tarea es crear un plan de entrenamiento **genérico** basado en arquetipos, no en datos fisiológicos específicos.
    
    **Flujo Lógico:**

    **Paso 1: Datos de Entrada del Entrenador**
    - Los datos se proporcionan en el objeto JSON. Incluyen \`raceType\`, \`runnerLevel\`, disponibilidad, y opcionalmente \`distance\`, \`elevation\` y \`raceProfileImage\`.

    **Paso 2: Rellenar Perfil del Corredor (runnerProfile)**
    - Usa directamente los valores de \`runnerLevel\` y \`raceType\` del input.
    - **OMITE EL CAMPO \`needs\`**.

    **Paso 3: Definición de Zonas de Entrenamiento Genéricas (trainingZones) - CRÍTICO**
    - Crea la tabla de zonas. **NO CALCULES NADA**.
    - **REGLA CRÍTICA:** Copia los valores de porcentaje EXACTOS de la 'TABLA DE ZONAS DE ENTRENAMIENTO A UTILIZAR'.
    - \`paceRange\` debe ser "N/A".
    - \`vamRange\` debe estar en formato "% VAM" (ej: "60% VAM").
    - \`fcRange\` debe estar en formato "%FCmáx" (ej: "70% FCmáx").

    **Paso 4: ESTRUCTURA SEMANAL Y PERIODIZACIÓN**
    
    ${PLAN_STRUCTURE_CALCULATION}

    Ahora, con las duraciones de las fases ya definidas, procede a rellenar el contenido de cada semana siguiendo estas reglas:

    ${CROSS_TRAINING_PHILOSOPHY}

    - **CONTENIDO PARA LA FASE BASE:**
      - **Objetivo:** Construir la base aeróbica y fortalecer fundamentos.
      - **REGLA DE ASIGNACIÓN DE MÉTODOS:** Para CADA sesión de CARRERA en esta fase, el campo \`method\` DEBE ser uno de los **MÉTODOS AISLADOS** (ej. "Continuo Extensivo", "Fraccionado en Subida"). No combines estímulos.

    - **CONTENIDO PARA LA FASE ESPECÍFICA:**
      - **Objetivo:** Simular la competición y mejorar los factores limitantes.
      - **REGLA DE ASIGNACIÓN DE MÉTODOS:** Para las sesiones de intensidad en esta fase, el campo \`method\` DEBE ser uno de los **MÉTODOS DE APROXIMACIÓN o COMBINADOS**. **DEBES variar estas estructuras y métodos entre las semanas de la fase específica para evitar la monotonía y proporcionar un estímulo de entrenamiento más completo y dinámico.**
      - **Selección de Método según Tipo de Carrera:**
        - **Larga/Ultra:** El foco es la **Resistencia a la Fatiga**. Usa métodos como "Back-to-Back", "Resistencia a la Fatiga: Bloques", etc.
        - **Media/Corta:** El foco es la **Simulación de Competición**. Usa "Fraccionado Modelado" y "Trail Modelado".
        
    - **CONTENIDO PARA LA FASE DE TAPERING:**
      - **Objetivo:** Reducir fatiga, maximizar la supercompensación y llegar fresco a la carrera.
      - **REGLA DE ASIGNACIÓN DE MÉTODOS:** Usa versiones de bajo volumen de los **MÉTODOS COMBINADOS**. El \`method\` debe ser "Recordatorio de Ritmo (Modelado Corto)".
      - **Volumen y Intensidad:** Reduce el volumen total (ej. 40-60% menos), pero mantén 1 o 2 picos cortos de intensidad al principio de la semana de la carrera para mantener la "chispa".
    
    **Paso 4.5: ANÁLISIS DEL PERFIL DE LA CARRERA (SI SE PROPORCIONA IMAGEN)**
    - **Si se proporciona una imagen del perfil de la carrera, esta es una tarea de MÁXIMA PRIORIDAD.** Analiza la imagen en detalle.
    - **Identifica:** Subidas clave (ubicación, longitud), bajadas (técnicas/rápidas), y distribución del desnivel.
    - **Acción CRÍTICA:** Usa esta información para que los entrenamientos de la Fase Específica sean relevantes. Adapta los métodos ("Resistencia a la Fatiga: Bloques", "Fraccionado Modelado", "Trail Modelado") al perfil.
    - **Acción Adicional:** Menciona explícitamente cómo has adaptado el plan al perfil en el campo \`raceProfileAdaptations\`.

    **Paso 5: Detalle de Sesiones (sessions) - ¡¡MUY IMPORTANTE!!**
    
    ${DURATION_MANAGEMENT_PROMPT_BLOCK}

    ${INTERVAL_DESIGN_GUIDELINES}

    ${SESSION_NAMING_GUIDELINES}
    
    ${ELEVATION_PROGRESSION_GUIDELINES}

    - **REGLA CRÍTICA PARA 'targetZone':**
      - La intensidad en \`targetZone\` DEBE expresarse **SIEMPRE** usando una combinación de **%VAM**, **%FCmáx** y **RPE**.
      - **Ejemplo de formato OBLIGATORIO:** "Z3+ | %VAM: 100% | %FCmáx: 100% | RPE: 9-10"

    - **Regla de Pasos Estructurados (\`structuredSteps\`) - TAREA OBLIGATORIA:**
      - Para **CADA** \`DailySession\` que no sea un día de descanso total, **DEBES** rellenar el array \`structuredSteps\`.
      - Este array es una traducción legible por máquina del campo \`details\`.
      - **Desglosa** la sesión en sus componentes lógicos (calentamiento, series, recuperaciones, enfriamiento, etc.).
      - **Duración:** \`durationValue\` DEBE estar en **SEGUNDOS**. La suma de todos los \`durationValue\` del array DEBE ser igual a la duración total de la sesión en segundos.

    **Paso 6: Tareas Complementarias y Métricas de Control**
    - Proporciona guías **genéricas** para fuerza y movilidad.
    - Si se proporcionan \`distance\` y \`elevation\`, calcula el \`elevationRatio\` (m/km) y úsalo para hacer las adaptaciones más específicas. Si no, usa textos genéricos.
            
    **Paso 7: Glosario de Términos (glossary)**
    - Escanea el plan y define términos técnicos como CACO, Back-to-Back, etc. SIEMPRE incluye los que uses.
    
    **--- DEFINICIONES Y TABLAS DE REFERENCIA ---**
    ${REFERENCE_TABLES}
    `;
    
    return `
    Eres un entrenador experto de trail running. Tu tarea es generar una **plantilla de plan de entrenamiento genérico** en formato JSON.
    Este plan NO es para un individuo específico, sino para un perfil de corredor (ej. Principiante que prepara una carrera Media).
    Sigue ESTRICTAMENTE la metodología y la estructura JSON que te proporciono.

    **REGLA CRÍTICA DE FORMATO:** El output DEBE ser un único bloque de código JSON válido. Asegúrate de que todas las cadenas de texto dentro del JSON estén correctamente escapadas (por ejemplo, usar \\" para comillas dentro de una cadena). Revisa dos veces que no falten comas entre los elementos de los objetos o arrays, y que todos los corchetes y llaves estén correctamente cerrados. Un JSON mal formado es inaceptable.

    **ESTRUCTURA JSON DE SALIDA:**
    ${jsonSchema}

    **METODOLOGÍA PARA PLANES GENÉRICOS:**
    ${coachMethodology}

    **DATOS DEL ENTRENADOR (para la plantilla):**
    ${JSON.stringify({ ...userInput, raceProfileImage: 'IMAGE_PROVIDED_SEPARATELY' }, null, 2)}

    Ahora, genera el objeto JSON \\\`TrainingPlan\\\` completo y válido.
    `;
}


export const generateTrainingPlan = async (userInput: UserInput | CoachInput): Promise<TrainingPlan> => {
  try {
    if (!process.env.API_KEY) {
      throw new Error("No se encontró la clave de API. Asegúrate de que la variable de entorno API_KEY está configurada en tu entorno de despliegue.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const promptText = isRunnerInput(userInput) ? getRunnerPrompt(userInput) : getCoachPrompt(userInput);
    const model = 'gemini-2.5-flash';

    const parts: any[] = [{ text: promptText }];

    if (userInput.raceProfileImage) {
      const match = userInput.raceProfileImage.match(/^data:(image\/.*?);base64,(.*)$/);
      if (match && match[1] && match[2]) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
      }
    });

    const jsonText = response.text;

    let cleanJsonText = jsonText.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const matchJson = cleanJsonText.match(fenceRegex);
    if (matchJson && matchJson[2]) {
      cleanJsonText = matchJson[2].trim();
    }
    
    if (cleanJsonText.startsWith('json\n')) {
        cleanJsonText = cleanJsonText.substring(5);
    }

    const plan: TrainingPlan = JSON.parse(cleanJsonText);
    return plan;

  } catch (error) {
    console.error("Error al generar el plan de entrenamiento:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            throw new Error('La clave de API no es válida. Por favor, verifica que la has configurado correctamente.');
        }
        if (error.message.includes('API_KEY')) {
             throw new Error('No se encontró la clave de API. Asegúrate de que la variable de entorno API_KEY está configurada en tu entorno de despliegue.');
        }
        throw new Error(`Fallo al generar el plan: ${error.message}`);
    }
    throw new Error("Ocurrió un error desconocido al generar el plan de entrenamiento.");
  }
};

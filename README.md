# HIGHFLY Skin Studio — V10 estable + V12, V13.1, V14 y V14.1 experimentales (Pages aislada)

**Estable V10:** https://drakentzy07.github.io/HIGHFLY-SKIN3-LAB-Copiar/

**Vista previa V12 (aislada):** https://drakentzy07.github.io/HIGHFLY-SKIN3-LAB-Copiar/v12/

**Vista previa V13.1 (aislada):** https://drakentzy07.github.io/HIGHFLY-SKIN3-LAB-Copiar/v13-1/

**Vista previa V14 (modelo 3D real, aislada):** https://drakentzy07.github.io/HIGHFLY-SKIN3-LAB-Copiar/v14/

**Vista previa V14.1 (encastre casco+cabeza real, aislada):** https://drakentzy07.github.io/HIGHFLY-SKIN3-LAB-Copiar/v14-1/

**V14.1 GREEN fijado:** `drakentzy07/cobalt-hollow-lab@a22e0dafcac87452b958afaaa5d7e53a2e10f7b3`, [RUN #37970676230](https://github.com/drakentzy07/cobalt-hollow-lab/actions/runs/37970676230).

**V14 fuente GREEN e inmutable:** `drakentzy07/cobalt-hollow-lab@092b343cc5d4e86fbf200ab27c9f5d87febb781c`, [RUN #37966787917](https://github.com/drakentzy07/cobalt-hollow-lab/actions/runs/37966787917).

**V13.1 fuente GREEN e inmutable:** `drakentzy07/cobalt-hollow-lab@2056719c5428fe050be8aa1cfbbc7cf4b816429e`, [RUN #37961703251](https://github.com/drakentzy07/cobalt-hollow-lab/actions/runs/37961703251).

**V12 candidata fijada:** `drakentzy07/cobalt-hollow-lab@67ee8fa0e32db82f9d93a4b00f2694459cca104a`, RUN GREEN [#37956239750](https://github.com/drakentzy07/cobalt-hollow-lab/actions/runs/37956239750). V12 NO reemplaza a V10: su subruta se añade con su propio HTML, módulos y GLB originales. Conservar ambas permite comparar en un Samsung S23 Ultra antes de la aceptación artística.

**V10 fuente fijada:** `drakentzy07/cobalt-hollow-lab@7f5f69de4e572b2ea79b2e8a1bc7bda3ece0425d` — RUN original V10 GREEN #37874069648.

**V10 backup:** rama `backup-public-v10-2026-10-09`.

**Anterior V4 (backup):** rama `backup-public-v4-2026-10-09`; ningún cambio en el juego.

## Qué incluye
- Personaje auténtico de ClaudeCraft/HIGHFLY `warrior_modular.glb`, `Rig_Medium` de 23 huesos, dos variantes de Hunter. El personaje fuente se solicita directamente a su repositorio original fijado; **no se incluye** el GLB original en nuestra Pages.
- KAGE-ONI V6: casco rígido original hecho con Blender y anclado al hueso real `head`.
- NIGHTFALL V8: **36 mallas 3D nuevas**, 6 ranuras y 2 variantes de cuerpo; pesos del rig original (no se crea otro esqueleto).
- Skin Studio V10: editor Three.js con vestimenta/desvestimenta, GLB de importación/exportación, cámara, prueba de animación, mezclado seguro con sistemas previos V4/V5.
- Validación automática de archivo glTF, pesos, Firefox no certificado, Chrome móvil simulado, vistas frontal/perfil/espalda y regreso seguro al personaje original.

## Cómo se publica
La Pages independiente reconstruye los dos GLB con Blender 4.2.23 LTS verificado, compila el compositor auténtico fijado, prueba el editor sobre el Hunter original en Chromium y sube únicamente el paquete V10 verificado. Solo se modifica **este repositorio**, nunca `cobalt-hollow-lab` main, HIGHFLY PF6, estadísticas de entrenamiento, monstruos ni habilidades.

La rutina de verificación separada comprueba la URL pública y los dos GLB. Si GitHub solicita activar Pages: `Settings → Pages → Source = GitHub Actions` (ya estaba activo y funcionando desde V4).

## Restricciones honestas
**GREEN técnico no equivale a aprobación artística.** La ausencia de clipping para todas las animaciones, el refinamiento AAA, el motor de IA generativa de diseños libres, la exportación/importación final a Unity y las pruebas en un **Samsung S23 Ultra físico** todavía están pendientes.

Se consultan los créditos y licencias de los assets de fuente: [CREDITS.md upstream](https://github.com/levy-street/world-of-claudecraft/blob/9b57e49c9676d75962700f828cc00a50a9a988b5/CREDITS.md). KayKit character packs y Rig_Medium animations constan CC0 en ese registro, pero el registro gobierna cada media asset y no se debe inferir que el MIT del código autoriza toda su arte.

**Ruta de regreso V4:** `backup-public-v4-2026-10-09`. La copia de seguridad es una rama aislada y **no** dispara despliegues.

## V12 preview — NO es aún skin premium aprobada
La revisión V12 construye 92 mallas nuevas/previas (36 de V8 + 56 añadidas), 23 huesos originales, 15.376 triángulos y 7.884 vértices ponderados en el cuerpo; abdomen, cadera, muslos, faldones, hombreras, cuello y espalda, con gambesón oscuro reversible. Falta aceptación visual de usuario, clipping completo y Unity/S23 físico. No modificar la Pages del juego.

## V13.1 — pintura PBR real horneada en GLB

La ruta /v13-1/ preserva original Rig_Medium y 92 mallas de Nightfall V12. El usuario viste Nightfall, toca una placa, edita color/metal/rugosidad y descarga **un NUEVO GLB 3D con la pintura físicamente guardada en los materiales**, distinto de la receta JSON. Su fuente es el GLB original de Nightfall; se duplican únicamente materiales/definiciones JSON de las piezas seleccionadas sin cambiar ni un byte de buffers binarios, pesos, articulaciones ni geometría. El casco Kage-Oni permanece como GLB separado; las 22 animaciones donantes incluidas en el GLB de forja se omiten del export pintado para no duplicar autoridad del Hunter.

Las pruebas automáticas abren el editor con dimensiones Android, pintan ambas variantes, descargan efectivamente el GLB, comparan los buffers originales y validan el archivo en Khronos, **sin garantizar todavía una importación funcional en Unity ni en Samsung físico**.

**Las tres rutas se publican juntas; la raíz estable V10 y la candidata V12 NO se reemplazan.** La Pages del juego principal nunca es el destino.

## V14 — FIRST TRUE EDITABLE WEIGHTED GEOMETRY

El nuevo panel permite seleccionar una malla real Nightfall forjada y modificar ancho(X), alto(Y), profundidad(Z), offset X/Y/Z dentro de límites moderados, sincronizando el resultado entre M/F del mismo slot. La geometría fuente se mantiene intacta y es restaurable. Guardar/abrir forma JSON permite continuar el trabajo. Descargar GLB Final produce otro GLB REAL con nuevos POSITION/NORMAL bufferViews y la pintura PBR de V13.1. Se mantienen binarios originales como prefijo byte-identico, los 23 huesos fuente, JOINTS_0/WEIGHTS_0, inversas del bind y animaciones del Hunter como única autoridad. La prueba descarga el archivo real, inspecciona los nuevos vértices de ambas variantes y exige Khronos cero errores. **26 comprobaciones** V14; también regresiones V10–V13.1.

**Limitaciones:** versión de laboratorio, NO recrea automáticamente una referencia visual, ni fabrica mallas arbitrarias nuevas; los sliders son escalas/offsets controlados. No tiene validación artística premium ni prueba física S23 ni Unity import; el casco aún se exporta aparte. Posible clipping bajo animaciones extremas: iterar visualmente antes de integrar.

Las 4 rutas se publican en el mismo repositorio Pages independiente; no se toca HIGHFLY game Pages ni su rama congelada.

## V14.1 original helmet fit — closed Oni anatomy

El visor calibró automáticamente la CORONA KAGE-ONI contra la anchura auténtica del cráneo M_Head del original Rig_Medium. Presets open/semi_closed/closed/oni_heavy/samurai_masked, controles reversibles limitados de escala rígida y desplazamiento X/Y/Z, y ocultación/restauración del rostro por tipo de casco. **No reescala ni cambia geometría original del Hunter**, tampoco huesos, weights, animaciones o Unity. La ocultación deliberada de la cabeza en un casco completo no debe interpretarse como eliminación del modelo.

El RUN superó 26 comprobaciones específicas en Chromium simulado tamaño S23, inspecciones frente/perfil/espalda y ambas variantes Hunter. El cociente de anchura corona/cráneo resultó 1.0509 y la escala por defecto 0.9396; son mediciones de laboratorio, no una aprobación artística. El GLB original del casco descargado sigue sin hornear estos offsets; los sliders de fit son por ahora ajustes de vista previa. Se requiere prueba física Samsung y ajuste artístico cuello/casco antes de un set premium final. Solo publicar en la Pages independiente.

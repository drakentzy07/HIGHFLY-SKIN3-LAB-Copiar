# HIGHFLY Skin Studio V10 — GitHub Pages independiente

**Sitio:** https://drakentzy07.github.io/HIGHFLY-SKIN3-LAB-Copiar/

**V10 fuente fijada:** `drakentzy07/cobalt-hollow-lab@7f5f69de4e572b2ea79b2e8a1bc7bda3ece0425d` — RUN original V10 GREEN #37874069648.

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

# REGIME ENGINE V2 — Prototyper P8 cualificado

**BUILDER_READY=YES. Producción continúa bloqueada. Builder no se ha ejecutado.**

La entrega vigente para Control Tower es [P8 / README](p8/README.md). Cierra los nueve grupos de parámetros y los contratos de precio, disponibilidad, replay y frescura, manteniendo `EVIDENCE_STATE_ENGINE`, la taxonomía y V1.

- [Manifiesto de parámetros vinculado](p8/parameter-manifest.json)
- [Registry cualificado de 59 features](p8/feature-registry-qualified.json)
- [Contratos por feature/familia](p8/price-series-contract.json) y [disponibilidad temporal](p8/temporal-availability-contract.json)
- [Gate verificable](p8/gate-result.json), [comprobaciones del paquete](p8/package-check-results.json) y [preservación](p8/preservation.json)

P8 conserva 124 capturas, 1.930 sesiones completas R2, tres ventanas walk-forward y seis candidatos congelados. C03 fue seleccionado en entrenamiento en las tres ventanas. Las 464 pruebas desde series crudas, 21 controles de contratos, 16 comprobaciones conceptuales y 25 pruebas existentes de V1 pasan.

**R2 es investigación retrospectiva; no acredita OOS point-in-time estricto.** Los conteos históricos son R0=0, R1=0, R2=45 y UNKNOWN=14. Solo nueve condiciones son decisiones core y hay dos unidades de concordancia, nunca 59 votos.

Los documentos P1–P7 del directorio superior quedan como evidencia del contrato simbólico original. Sus valores UNBOUND y su checker de 16 pruebas corresponden al gate anterior; los contratos vinculantes actuales están en `p8/`. El [README anterior](p8/p7-readme-at-entry.md) conserva esa entrega íntegra. La tabla de decisión y el inventario original mantienen sus bytes.

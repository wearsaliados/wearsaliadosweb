-- Revierte 2 ventas de prueba más (Náuticos Azul — Talla 40 y Náuticos
-- Verde — Talla 42, 1 unidad, $75 cada una, en el Punto físico principal)
-- y el cierre de caja de prueba hecho al probar ese flujo, restaurando el
-- inventario correspondiente. Al borrar el cierre, cualquier venta real
-- que aún lo referencie queda sin cierre asignado (ON DELETE SET NULL) en
-- vez de perderse.

CREATE TEMP TABLE _t_azul_40 AS
SELECT s.id AS sale_id, s."productId", s."locationId", s.quantity, s."cashClosingId"
FROM "Sale" s
JOIN "Product" p ON s."productId" = p.id
JOIN "Location" l ON s."locationId" = l.id
WHERE p.name = 'Náuticos Azul — Talla 40'
  AND l.name = 'Punto físico principal'
  AND s.quantity = 1
  AND s."unitPrice" = 75
ORDER BY s."saleDate" DESC
LIMIT 1;

CREATE TEMP TABLE _t_verde_42 AS
SELECT s.id AS sale_id, s."productId", s."locationId", s.quantity, s."cashClosingId"
FROM "Sale" s
JOIN "Product" p ON s."productId" = p.id
JOIN "Location" l ON s."locationId" = l.id
WHERE p.name = 'Náuticos Verde — Talla 42'
  AND l.name = 'Punto físico principal'
  AND s.quantity = 1
  AND s."unitPrice" = 75
ORDER BY s."saleDate" DESC
LIMIT 1;

UPDATE "InventoryItem" ii
SET quantity = ii.quantity + t.quantity
FROM _t_azul_40 t
WHERE ii."productId" = t."productId"
  AND ii."locationId" = t."locationId";

UPDATE "InventoryItem" ii
SET quantity = ii.quantity + t.quantity
FROM _t_verde_42 t
WHERE ii."productId" = t."productId"
  AND ii."locationId" = t."locationId";

DELETE FROM "InventoryMovement" im
USING _t_azul_40 t
WHERE im."saleId" = t.sale_id;

DELETE FROM "InventoryMovement" im
USING _t_verde_42 t
WHERE im."saleId" = t.sale_id;

DELETE FROM "Sale" s
USING _t_azul_40 t
WHERE s.id = t.sale_id;

DELETE FROM "Sale" s
USING _t_verde_42 t
WHERE s.id = t.sale_id;

-- Elimina el cierre de caja de prueba: el asociado a cualquiera de las dos
-- ventas si tenía uno, o si no, el cierre más reciente registrado.
DELETE FROM "CashClosing" cc
WHERE cc.id = (
  SELECT COALESCE(
    (SELECT t."cashClosingId" FROM _t_azul_40 t WHERE t."cashClosingId" IS NOT NULL LIMIT 1),
    (SELECT t."cashClosingId" FROM _t_verde_42 t WHERE t."cashClosingId" IS NOT NULL LIMIT 1),
    (SELECT cc2.id FROM "CashClosing" cc2 ORDER BY cc2."closedAt" DESC LIMIT 1)
  )
);

DROP TABLE _t_azul_40;
DROP TABLE _t_verde_42;

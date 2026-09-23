-- Revierte la venta de prueba hecha para probar el nuevo comprobante del
-- cajero (Náuticos Azul — Talla 40, 1 unidad, $75, Bolívares, en el Punto
-- físico principal): restaura el inventario descontado y elimina el
-- movimiento y el registro de venta asociados.

WITH target_sale AS (
  SELECT s.id AS sale_id, s."productId", s."locationId", s.quantity
  FROM "Sale" s
  JOIN "Product" p ON s."productId" = p.id
  JOIN "Location" l ON s."locationId" = l.id
  WHERE p.name = 'Náuticos Azul — Talla 40'
    AND l.name = 'Punto físico principal'
    AND s.quantity = 1
    AND s."unitPrice" = 75
    AND s."paymentMethod" = 'BOLIVARES'
  ORDER BY s."saleDate" DESC
  LIMIT 1
)
UPDATE "InventoryItem" ii
SET quantity = ii.quantity + ts.quantity
FROM target_sale ts
WHERE ii."productId" = ts."productId"
  AND ii."locationId" = ts."locationId";

WITH target_sale AS (
  SELECT s.id AS sale_id
  FROM "Sale" s
  JOIN "Product" p ON s."productId" = p.id
  JOIN "Location" l ON s."locationId" = l.id
  WHERE p.name = 'Náuticos Azul — Talla 40'
    AND l.name = 'Punto físico principal'
    AND s.quantity = 1
    AND s."unitPrice" = 75
    AND s."paymentMethod" = 'BOLIVARES'
  ORDER BY s."saleDate" DESC
  LIMIT 1
)
DELETE FROM "InventoryMovement" im
USING target_sale ts
WHERE im."saleId" = ts.sale_id;

WITH target_sale AS (
  SELECT s.id AS sale_id
  FROM "Sale" s
  JOIN "Product" p ON s."productId" = p.id
  JOIN "Location" l ON s."locationId" = l.id
  WHERE p.name = 'Náuticos Azul — Talla 40'
    AND l.name = 'Punto físico principal'
    AND s.quantity = 1
    AND s."unitPrice" = 75
    AND s."paymentMethod" = 'BOLIVARES'
  ORDER BY s."saleDate" DESC
  LIMIT 1
)
DELETE FROM "Sale" s
USING target_sale ts
WHERE s.id = ts.sale_id;

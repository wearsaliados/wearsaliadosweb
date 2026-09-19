-- Revierte las dos ventas de prueba registradas para Sambil mientras se
-- probaba el campo de precio de venta del aliado (Beige cierres, Talla 38
-- y Talla 39, 1 unidad cada una, sin nota). Restaura el inventario
-- descontado y elimina el movimiento y el registro de venta asociados.

-- 1) Restaura el inventario descontado por esas ventas
UPDATE "InventoryItem" ii
SET quantity = ii.quantity + s.quantity
FROM "Sale" s
JOIN "Ally" a ON s."allyId" = a.id
JOIN "Product" p ON s."productId" = p.id
WHERE ii."productId" = s."productId"
  AND ii."locationId" = s."locationId"
  AND a."businessName" = 'Make Waves C.C. Sambil Chacao'
  AND p.name IN ('Beige cierres — Talla 39', 'Beige cierres — Talla 38')
  AND s.quantity = 1
  AND s.note IS NULL;

-- 2) Elimina los movimientos de inventario creados por esas ventas
DELETE FROM "InventoryMovement" im
USING "InventoryItem" ii, "Sale" s, "Ally" a, "Product" p
WHERE im."inventoryItemId" = ii.id
  AND ii."productId" = s."productId"
  AND ii."locationId" = s."locationId"
  AND s."allyId" = a.id
  AND s."productId" = p.id
  AND a."businessName" = 'Make Waves C.C. Sambil Chacao'
  AND p.name IN ('Beige cierres — Talla 39', 'Beige cierres — Talla 38')
  AND s.quantity = 1
  AND s.note IS NULL
  AND im.type = 'SALE'
  AND im."quantityDelta" = -1
  AND im."createdAt" >= '2026-08-27'::date;

-- 3) Elimina los registros de venta de prueba
DELETE FROM "Sale" s
USING "Ally" a, "Product" p
WHERE s."allyId" = a.id
  AND s."productId" = p.id
  AND a."businessName" = 'Make Waves C.C. Sambil Chacao'
  AND p.name IN ('Beige cierres — Talla 39', 'Beige cierres — Talla 38')
  AND s.quantity = 1
  AND s.note IS NULL;

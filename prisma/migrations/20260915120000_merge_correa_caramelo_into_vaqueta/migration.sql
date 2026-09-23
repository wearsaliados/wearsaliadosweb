-- "Correa caramelo" y "Correa vaqueta" eran dos productos DISTINTOS por
-- talla (SKUs "WR-SAN-CORREA-CARAMELO-*" y "WR-SAN-CORREA-VAQUETA-*"), y las
-- migraciones anteriores solo les cambiaron el nombre de exhibición al
-- primero, sin fusionar el inventario. Eso dejó dos filas de Product con el
-- mismo nombre por cada talla, lo que hacía aparecer tallas duplicadas en
-- los selectores y rompía la transferencia cuando se elegía la fila
-- equivocada (sin stock real en fábrica). Aquí se fusiona de verdad: se
-- pasa todo el inventario, movimientos y ventas de "Correa caramelo" al
-- producto "Correa vaqueta" de la misma talla, y se elimina el duplicado.

-- 1) Donde ambos productos ya tienen inventario en la misma ubicación:
--    suma la cantidad al de "Correa vaqueta" y mueve el historial de
--    movimientos a esa fila antes de borrar la fila duplicada.
WITH pairs AS (
  SELECT loser.id AS loser_id, keeper.id AS keeper_id
  FROM "Product" loser
  JOIN "Product" keeper
    ON keeper."collectionId" = loser."collectionId"
   AND keeper.size = loser.size
   AND keeper.id <> loser.id
   AND keeper.sku LIKE 'WR-SAN-CORREA-VAQUETA-%'
  WHERE loser.sku LIKE 'WR-SAN-CORREA-CARAMELO-%'
),
matched_items AS (
  SELECT li.id AS loser_item_id, ki.id AS keeper_item_id, li.quantity AS loser_qty
  FROM pairs p
  JOIN "InventoryItem" li ON li."productId" = p.loser_id
  JOIN "InventoryItem" ki ON ki."productId" = p.keeper_id AND ki."locationId" = li."locationId"
)
UPDATE "InventoryMovement" m
SET "inventoryItemId" = mi.keeper_item_id
FROM matched_items mi
WHERE m."inventoryItemId" = mi.loser_item_id;

WITH pairs AS (
  SELECT loser.id AS loser_id, keeper.id AS keeper_id
  FROM "Product" loser
  JOIN "Product" keeper
    ON keeper."collectionId" = loser."collectionId"
   AND keeper.size = loser.size
   AND keeper.id <> loser.id
   AND keeper.sku LIKE 'WR-SAN-CORREA-VAQUETA-%'
  WHERE loser.sku LIKE 'WR-SAN-CORREA-CARAMELO-%'
),
matched_items AS (
  SELECT li.id AS loser_item_id, ki.id AS keeper_item_id, li.quantity AS loser_qty
  FROM pairs p
  JOIN "InventoryItem" li ON li."productId" = p.loser_id
  JOIN "InventoryItem" ki ON ki."productId" = p.keeper_id AND ki."locationId" = li."locationId"
)
UPDATE "InventoryItem" ki
SET quantity = ki.quantity + mi.loser_qty
FROM matched_items mi
WHERE ki.id = mi.keeper_item_id;

WITH pairs AS (
  SELECT loser.id AS loser_id, keeper.id AS keeper_id
  FROM "Product" loser
  JOIN "Product" keeper
    ON keeper."collectionId" = loser."collectionId"
   AND keeper.size = loser.size
   AND keeper.id <> loser.id
   AND keeper.sku LIKE 'WR-SAN-CORREA-VAQUETA-%'
  WHERE loser.sku LIKE 'WR-SAN-CORREA-CARAMELO-%'
),
matched_items AS (
  SELECT li.id AS loser_item_id, ki.id AS keeper_item_id
  FROM pairs p
  JOIN "InventoryItem" li ON li."productId" = p.loser_id
  JOIN "InventoryItem" ki ON ki."productId" = p.keeper_id AND ki."locationId" = li."locationId"
)
DELETE FROM "InventoryItem" li
USING matched_items mi
WHERE li.id = mi.loser_item_id;

-- 2) El inventario de "Correa caramelo" que quedaba en ubicaciones donde
--    "Correa vaqueta" no tenía nada: se reasigna al producto "Correa
--    vaqueta" (conserva su historial de movimientos, solo cambia de dueño).
WITH pairs AS (
  SELECT loser.id AS loser_id, keeper.id AS keeper_id
  FROM "Product" loser
  JOIN "Product" keeper
    ON keeper."collectionId" = loser."collectionId"
   AND keeper.size = loser.size
   AND keeper.id <> loser.id
   AND keeper.sku LIKE 'WR-SAN-CORREA-VAQUETA-%'
  WHERE loser.sku LIKE 'WR-SAN-CORREA-CARAMELO-%'
)
UPDATE "InventoryItem" li
SET "productId" = p.keeper_id
FROM pairs p
WHERE li."productId" = p.loser_id;

-- 3) Reasigna las ventas históricas registradas bajo "Correa caramelo".
WITH pairs AS (
  SELECT loser.id AS loser_id, keeper.id AS keeper_id
  FROM "Product" loser
  JOIN "Product" keeper
    ON keeper."collectionId" = loser."collectionId"
   AND keeper.size = loser.size
   AND keeper.id <> loser.id
   AND keeper.sku LIKE 'WR-SAN-CORREA-VAQUETA-%'
  WHERE loser.sku LIKE 'WR-SAN-CORREA-CARAMELO-%'
)
UPDATE "Sale" s
SET "productId" = p.keeper_id
FROM pairs p
WHERE s."productId" = p.loser_id;

-- 4) Elimina las filas de producto "Correa caramelo", ya fusionadas.
WITH pairs AS (
  SELECT loser.id AS loser_id, keeper.id AS keeper_id
  FROM "Product" loser
  JOIN "Product" keeper
    ON keeper."collectionId" = loser."collectionId"
   AND keeper.size = loser.size
   AND keeper.id <> loser.id
   AND keeper.sku LIKE 'WR-SAN-CORREA-VAQUETA-%'
  WHERE loser.sku LIKE 'WR-SAN-CORREA-CARAMELO-%'
)
DELETE FROM "Product" pr
USING pairs p
WHERE pr.id = p.loser_id;

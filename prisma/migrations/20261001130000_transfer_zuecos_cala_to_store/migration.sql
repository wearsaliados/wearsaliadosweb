-- Transfiere 1 par por talla de Zuecos Cala (Beige y Negro, tallas 38 a 44)
-- desde "Fábrica (lista para reposición)" hacia "Punto físico principal",
-- igual que lo haría el admin desde Inventario > Transferir stock.

CREATE TEMP TABLE _zuecos_transfer AS
SELECT p.id AS product_id
FROM "Product" p
WHERE p.sku IN (
  'ZU001BE38','ZU001BE39','ZU001BE40','ZU001BE41','ZU001BE42','ZU001BE43','ZU001BE44',
  'ZU001NE38','ZU001NE39','ZU001NE40','ZU001NE41','ZU001NE42','ZU001NE43','ZU001NE44'
);

-- Descuenta 1 unidad de cada producto en Fábrica.
UPDATE "InventoryItem" ii
SET quantity = ii.quantity - 1, "updatedAt" = now()
FROM _zuecos_transfer t,
     (SELECT id FROM "Location" WHERE id = 'loc-factory' OR name = 'Fábrica (lista para reposición)' LIMIT 1) fl
WHERE ii."productId" = t.product_id
  AND ii."locationId" = fl.id;

INSERT INTO "InventoryMovement" (id, "inventoryItemId", type, "quantityDelta", note)
SELECT gen_random_uuid()::text, ii.id, 'TRANSFER_OUT', -1, 'Entregado a Punto físico principal'
FROM "InventoryItem" ii
JOIN _zuecos_transfer t ON ii."productId" = t.product_id
JOIN (SELECT id FROM "Location" WHERE id = 'loc-factory' OR name = 'Fábrica (lista para reposición)' LIMIT 1) fl
  ON ii."locationId" = fl.id;

-- Crea o incrementa el ítem en Punto físico principal con 1 unidad.
INSERT INTO "InventoryItem" (id, "productId", "locationId", quantity, "acquisitionType", "unitCost", "updatedAt")
SELECT gen_random_uuid()::text, t.product_id, sl.id, 1, 'PURCHASE', p.cost, now()
FROM _zuecos_transfer t
JOIN "Product" p ON p.id = t.product_id
CROSS JOIN (SELECT id FROM "Location" WHERE id = 'loc-store-1' OR name = 'Punto físico principal' LIMIT 1) sl
ON CONFLICT ("productId", "locationId")
DO UPDATE SET quantity = "InventoryItem".quantity + 1, "updatedAt" = now();

INSERT INTO "InventoryMovement" (id, "inventoryItemId", type, "quantityDelta", note)
SELECT gen_random_uuid()::text, ii.id, 'TRANSFER_IN', 1, 'Recibido de Fábrica (lista para reposición)'
FROM "InventoryItem" ii
JOIN _zuecos_transfer t ON ii."productId" = t.product_id
JOIN (SELECT id FROM "Location" WHERE id = 'loc-store-1' OR name = 'Punto físico principal' LIMIT 1) sl
  ON ii."locationId" = sl.id;

DROP TABLE _zuecos_transfer;

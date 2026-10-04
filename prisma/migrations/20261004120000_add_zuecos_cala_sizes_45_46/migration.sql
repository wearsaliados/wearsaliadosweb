-- Agrega las tallas 45 y 46 a Zuecos Cala (Beige y Negro) en Fábrica
-- (lista para reposición): Beige 45x1, Beige 46x1, Negro 45x0, Negro 46x0.
-- Mismo precio/costo/costo de fabricación/stock mínimo que el resto de la
-- colección ($75 / $45 / $30 / 2).

-- Asegura que exista la colección "Zuecos Cala" (ya debería existir).
INSERT INTO "Collection" (id, name)
SELECT gen_random_uuid()::text, 'Zuecos Cala'
WHERE NOT EXISTS (SELECT 1 FROM "Collection" WHERE name = 'Zuecos Cala');

CREATE TEMP TABLE _zuecos_new_sizes (
  sku TEXT,
  name TEXT,
  size TEXT,
  quantity INT
);

INSERT INTO _zuecos_new_sizes (sku, name, size, quantity) VALUES
  ('ZU001BE45', 'Zuecos Cala Beige — Talla 45', '45', 1),
  ('ZU001BE46', 'Zuecos Cala Beige — Talla 46', '46', 1),
  ('ZU001NE45', 'Zuecos Cala Negro — Talla 45', '45', 0),
  ('ZU001NE46', 'Zuecos Cala Negro — Talla 46', '46', 0);

-- Crea los productos que no existan todavía (por si ya se intentaron agregar).
INSERT INTO "Product" (id, sku, barcode, name, size, price, cost, "manufacturingCost", "minStock", "collectionId", "updatedAt")
SELECT
  gen_random_uuid()::text, n.sku, n.sku, n.name, n.size, 75, 45, 30, 2, c.id, now()
FROM _zuecos_new_sizes n
CROSS JOIN (SELECT id FROM "Collection" WHERE name = 'Zuecos Cala') c
WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.sku = n.sku);

-- Crea el ítem de inventario en Fábrica (con quantity 0 para Negro, para
-- que la talla quede visible en Fábrica aunque todavía no tenga stock).
INSERT INTO "InventoryItem" (id, "productId", "locationId", quantity, "acquisitionType", "unitCost", "updatedAt")
SELECT gen_random_uuid()::text, p.id, fl.id, n.quantity, 'PURCHASE', 45, now()
FROM _zuecos_new_sizes n
JOIN "Product" p ON p.sku = n.sku
CROSS JOIN (
  SELECT id FROM "Location" WHERE id = 'loc-factory' OR name = 'Fábrica (lista para reposición)' LIMIT 1
) fl
WHERE NOT EXISTS (
  SELECT 1 FROM "InventoryItem" ii WHERE ii."productId" = p.id AND ii."locationId" = fl.id
);

-- Deja constancia del movimiento solo donde realmente entró stock (>0).
INSERT INTO "InventoryMovement" (id, "inventoryItemId", type, "quantityDelta", note)
SELECT gen_random_uuid()::text, ii.id, 'RECEIVE', ii.quantity, 'Recepción inicial de inventario'
FROM "InventoryItem" ii
JOIN "Product" p ON ii."productId" = p.id
JOIN _zuecos_new_sizes n ON n.sku = p.sku
WHERE n.quantity > 0
  AND NOT EXISTS (SELECT 1 FROM "InventoryMovement" im WHERE im."inventoryItemId" = ii.id);

DROP TABLE _zuecos_new_sizes;

-- Amplía la colección Zuecos Cala:
-- 1) Agrega tallas 35, 36 y 37 a Beige y Negro (0 unidades, listas para
--    cuando llegue el stock).
-- 2) Crea los nuevos colores Borgoña y Verde, con las 12 tallas (35 a 46),
--    todas en 0 unidades.
-- Mismo precio/costo/costo de fabricación/stock mínimo que el resto de la
-- colección ($75 / $45 / $30 / 2), recibidos en Fábrica (lista para
-- reposición).

-- Asegura que exista la colección "Zuecos Cala" (ya debería existir).
INSERT INTO "Collection" (id, name)
SELECT gen_random_uuid()::text, 'Zuecos Cala'
WHERE NOT EXISTS (SELECT 1 FROM "Collection" WHERE name = 'Zuecos Cala');

CREATE TEMP TABLE _zuecos_new_products (
  sku TEXT,
  name TEXT,
  size TEXT,
  quantity INT
);

INSERT INTO _zuecos_new_products (sku, name, size, quantity) VALUES
  ('ZU001BE35', 'Zuecos Cala Beige — Talla 35', '35', 0),
  ('ZU001BE36', 'Zuecos Cala Beige — Talla 36', '36', 0),
  ('ZU001BE37', 'Zuecos Cala Beige — Talla 37', '37', 0),
  ('ZU001NE35', 'Zuecos Cala Negro — Talla 35', '35', 0),
  ('ZU001NE36', 'Zuecos Cala Negro — Talla 36', '36', 0),
  ('ZU001NE37', 'Zuecos Cala Negro — Talla 37', '37', 0),
  ('ZU001BO35', 'Zuecos Cala Borgoña — Talla 35', '35', 0),
  ('ZU001BO36', 'Zuecos Cala Borgoña — Talla 36', '36', 0),
  ('ZU001BO37', 'Zuecos Cala Borgoña — Talla 37', '37', 0),
  ('ZU001BO38', 'Zuecos Cala Borgoña — Talla 38', '38', 0),
  ('ZU001BO39', 'Zuecos Cala Borgoña — Talla 39', '39', 0),
  ('ZU001BO40', 'Zuecos Cala Borgoña — Talla 40', '40', 0),
  ('ZU001BO41', 'Zuecos Cala Borgoña — Talla 41', '41', 0),
  ('ZU001BO42', 'Zuecos Cala Borgoña — Talla 42', '42', 0),
  ('ZU001BO43', 'Zuecos Cala Borgoña — Talla 43', '43', 0),
  ('ZU001BO44', 'Zuecos Cala Borgoña — Talla 44', '44', 0),
  ('ZU001BO45', 'Zuecos Cala Borgoña — Talla 45', '45', 0),
  ('ZU001BO46', 'Zuecos Cala Borgoña — Talla 46', '46', 0),
  ('ZU001VE35', 'Zuecos Cala Verde — Talla 35', '35', 0),
  ('ZU001VE36', 'Zuecos Cala Verde — Talla 36', '36', 0),
  ('ZU001VE37', 'Zuecos Cala Verde — Talla 37', '37', 0),
  ('ZU001VE38', 'Zuecos Cala Verde — Talla 38', '38', 0),
  ('ZU001VE39', 'Zuecos Cala Verde — Talla 39', '39', 0),
  ('ZU001VE40', 'Zuecos Cala Verde — Talla 40', '40', 0),
  ('ZU001VE41', 'Zuecos Cala Verde — Talla 41', '41', 0),
  ('ZU001VE42', 'Zuecos Cala Verde — Talla 42', '42', 0),
  ('ZU001VE43', 'Zuecos Cala Verde — Talla 43', '43', 0),
  ('ZU001VE44', 'Zuecos Cala Verde — Talla 44', '44', 0),
  ('ZU001VE45', 'Zuecos Cala Verde — Talla 45', '45', 0),
  ('ZU001VE46', 'Zuecos Cala Verde — Talla 46', '46', 0);

-- Crea los productos que no existan todavía (por si ya se intentaron agregar).
INSERT INTO "Product" (id, sku, barcode, name, size, price, cost, "manufacturingCost", "minStock", "collectionId", "updatedAt")
SELECT
  gen_random_uuid()::text, n.sku, n.sku, n.name, n.size, 75, 45, 30, 2, c.id, now()
FROM _zuecos_new_products n
CROSS JOIN (SELECT id FROM "Collection" WHERE name = 'Zuecos Cala') c
WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.sku = n.sku);

-- Crea el ítem de inventario en Fábrica con quantity 0, para que las
-- tallas queden visibles ahí aunque todavía no tengan stock.
INSERT INTO "InventoryItem" (id, "productId", "locationId", quantity, "acquisitionType", "unitCost", "updatedAt")
SELECT gen_random_uuid()::text, p.id, fl.id, n.quantity, 'PURCHASE', 45, now()
FROM _zuecos_new_products n
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
JOIN _zuecos_new_products n ON n.sku = p.sku
WHERE n.quantity > 0
  AND NOT EXISTS (SELECT 1 FROM "InventoryMovement" im WHERE im."inventoryItemId" = ii.id);

DROP TABLE _zuecos_new_products;

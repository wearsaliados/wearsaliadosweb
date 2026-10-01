-- Elimina lo que se haya agregado antes para "Zuecos Cala" (productos,
-- existencias y movimientos asociados) y lo vuelve a crear de forma limpia:
-- 14 productos (Beige y Negro, tallas 38 a 44) con su SKU/código de barras,
-- precio, costo, costo de fabricación y stock mínimo, más su recepción
-- inicial de inventario en "Fábrica (lista para reposición)".
--
-- Precio $75, costo $45, costo de fabricación $30 y stock mínimo 2 (los
-- mismos valores que se intentaban ingresar antes del arreglo del formulario).

CREATE TEMP TABLE _zuecos_old_products AS
SELECT p.id AS product_id
FROM "Product" p
LEFT JOIN "Collection" c ON p."collectionId" = c.id
WHERE c.name ILIKE 'zuecos cala' OR p.name ILIKE '%zuecos cala%';

DELETE FROM "Sale" s
USING _zuecos_old_products t
WHERE s."productId" = t.product_id;

DELETE FROM "InventoryMovement" im
USING "InventoryItem" ii, _zuecos_old_products t
WHERE im."inventoryItemId" = ii.id
  AND ii."productId" = t.product_id;

DELETE FROM "InventoryItem" ii
USING _zuecos_old_products t
WHERE ii."productId" = t.product_id;

DELETE FROM "Product" p
USING _zuecos_old_products t
WHERE p.id = t.product_id;

DROP TABLE _zuecos_old_products;

-- Asegura que exista la colección "Zuecos Cala".
INSERT INTO "Collection" (id, name)
SELECT gen_random_uuid()::text, 'Zuecos Cala'
WHERE NOT EXISTS (SELECT 1 FROM "Collection" WHERE name = 'Zuecos Cala');

CREATE TEMP TABLE _zuecos_new (
  sku TEXT,
  name TEXT,
  size TEXT,
  quantity INT
);

INSERT INTO _zuecos_new (sku, name, size, quantity) VALUES
  ('ZU001BE38', 'Zuecos Cala Beige — Talla 38', '38', 2),
  ('ZU001BE39', 'Zuecos Cala Beige — Talla 39', '39', 4),
  ('ZU001BE40', 'Zuecos Cala Beige — Talla 40', '40', 4),
  ('ZU001BE41', 'Zuecos Cala Beige — Talla 41', '41', 4),
  ('ZU001BE42', 'Zuecos Cala Beige — Talla 42', '42', 4),
  ('ZU001BE43', 'Zuecos Cala Beige — Talla 43', '43', 3),
  ('ZU001BE44', 'Zuecos Cala Beige — Talla 44', '44', 3),
  ('ZU001NE38', 'Zuecos Cala Negro — Talla 38', '38', 2),
  ('ZU001NE39', 'Zuecos Cala Negro — Talla 39', '39', 4),
  ('ZU001NE40', 'Zuecos Cala Negro — Talla 40', '40', 4),
  ('ZU001NE41', 'Zuecos Cala Negro — Talla 41', '41', 4),
  ('ZU001NE42', 'Zuecos Cala Negro — Talla 42', '42', 4),
  ('ZU001NE43', 'Zuecos Cala Negro — Talla 43', '43', 3),
  ('ZU001NE44', 'Zuecos Cala Negro — Talla 44', '44', 3);

INSERT INTO "Product" (id, sku, barcode, name, size, price, cost, "manufacturingCost", "minStock", "collectionId", "updatedAt")
SELECT
  gen_random_uuid()::text,
  n.sku,
  n.sku,
  n.name,
  n.size,
  75,
  45,
  30,
  2,
  c.id,
  now()
FROM _zuecos_new n
CROSS JOIN (SELECT id FROM "Collection" WHERE name = 'Zuecos Cala') c;

INSERT INTO "InventoryItem" (id, "productId", "locationId", quantity, "acquisitionType", "unitCost", "updatedAt")
SELECT gen_random_uuid()::text, p.id, l.id, n.quantity, 'PURCHASE', 45, now()
FROM _zuecos_new n
JOIN "Product" p ON p.sku = n.sku
CROSS JOIN (
  SELECT id FROM "Location" WHERE id = 'loc-factory' OR name = 'Fábrica (lista para reposición)' LIMIT 1
) l;

INSERT INTO "InventoryMovement" (id, "inventoryItemId", type, "quantityDelta", note)
SELECT gen_random_uuid()::text, ii.id, 'RECEIVE', ii.quantity, 'Recepción inicial de inventario'
FROM "InventoryItem" ii
JOIN "Product" p ON ii."productId" = p.id
JOIN _zuecos_new n ON n.sku = p.sku;

DROP TABLE _zuecos_new;

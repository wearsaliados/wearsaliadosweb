-- Corrige el precio de venta histórico registrado para las 4 unidades de
-- "Sandalias Herencia del Abuelo" vendidas por el aliado Sambil, para que su
-- rentabilidad quede fija en 80 - 40 = 40 por unidad ($160 en total),
-- sin importar cambios posteriores en el precio de catálogo del producto.
UPDATE "Sale" s
SET "unitPrice" = 80
FROM "Product" p, "Ally" a
WHERE s."productId" = p.id
  AND s."allyId" = a.id
  AND p.name = 'Sandalias Herencia del Abuelo'
  AND a."businessName" = 'Make Waves C.C. Sambil Chacao'
  AND s.quantity = 4
  AND s.note = 'Venta inicial pagada directamente a Wears';

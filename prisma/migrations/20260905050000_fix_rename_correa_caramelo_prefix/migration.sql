-- Las dos migraciones anteriores comparaban el nombre completo contra
-- 'Correa caramelo', pero los nombres reales incluyen la talla (por ejemplo
-- "Correa caramelo — Talla 40"), así que nunca coincidieron con ninguna fila.
-- Se corrige reemplazando solo el prefijo del modelo y conservando la talla.
UPDATE "Product"
SET name = regexp_replace(name, '^Correa caramelo', 'Correa vaqueta')
WHERE name ILIKE 'Correa caramelo%';

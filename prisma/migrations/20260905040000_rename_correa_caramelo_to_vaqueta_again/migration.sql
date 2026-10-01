-- Repite la unificación de nombre pedida el 3 de septiembre: "Correa
-- caramelo" (aliado comercial Sambil) sigue apareciendo como tal, así que
-- se vuelve a aplicar el cambio de nombre a "Correa vaqueta". Se usa ILIKE
-- para cubrir variantes de mayúsculas/minúsculas.
UPDATE "Product"
SET name = 'Correa vaqueta'
WHERE name ILIKE 'correa caramelo';

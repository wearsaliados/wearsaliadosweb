-- "Correa caramelo" y "Correa vaqueta" son el mismo producto (mismo modelo de
-- sandalia, correa color caramelo/vaqueta). Las unidades de "Correa caramelo"
-- solo están en el aliado comercial. Se unifica el nombre a "Correa vaqueta".
UPDATE "Product"
SET name = 'Correa vaqueta'
WHERE name = 'Correa caramelo';

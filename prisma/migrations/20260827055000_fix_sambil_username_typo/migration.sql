-- Corrige el usuario de acceso del aliado Sambil: "makewakesccsambil" (typo)
-- pasa a "makewavesccsambil". La contraseña no cambia.
UPDATE "User"
SET email = 'makewavesccsambil'
WHERE email = 'makewakesccsambil';

-- Cambia la contraseña del usuario administrador a "disfrutandoelproceso"
-- (hash bcrypt con 10 salt rounds, mismo esquema que usa la app).
UPDATE "User"
SET "passwordHash" = '$2b$10$NG1IIHMBnwYNySVI5pxNY.CpsvA0vIqSLZXsOWWBmxnNDQT3vaW9W'
WHERE email = 'admin@cueroswears.com';

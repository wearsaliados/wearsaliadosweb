# Wears Inventario

Plataforma interna para **El Barco Wears / Cueroswears.com**: control de
inventarios, ventas y consignación de la tienda en línea, los puntos
físicos, la fábrica y los aliados comerciales — cada uno con su propio
usuario.

## ¿Qué incluye?

- **Panel administrador** (`/admin`): inventario general por ubicación,
  catálogo de productos y colecciones, gestión de aliados (creación de
  usuarios, asignación de mercancía por compra o consignación, cuenta de
  deuda), historial de ventas, alertas de reposición, bandeja de soporte y
  estado de notificaciones.
- **Panel de aliados** (`/aliado`): cada aliado ve solo su propio
  inventario (sin poder editarlo), registra sus ventas, ve indicadores de
  disponibilidad (verde/ámbar/rojo), su saldo de consignación si aplica,
  el anuncio de próximas colecciones y formularios para "solicitar
  activación de marca" y reportar problemas con un producto.
- **Notificaciones** automáticas por correo (SMTP) y WhatsApp (WhatsApp
  Cloud API) cuando se registra una venta o una solicitud de soporte.
  Si no están configuradas, el sistema sigue funcionando y solo registra
  el intento como "omitido" (ver `/admin/configuracion`).

## Empezar en local

```bash
npm install
cp .env.example .env   # completa SESSION_SECRET y lo que necesites
npm run db:migrate     # crea la base de datos SQLite (dev.db)
npm run db:seed        # datos de ejemplo: admin + 2 aliados + productos
npm run dev
```

Usuarios de ejemplo creados por el seed (cámbialos en `.env` antes de
sembrar si quieres otros):

- Administrador: `admin@cueroswears.com` / `Wears2026!`
- Aliado (compra): `aliado1@cueroswears.com` / `Aliado2026!`
- Aliado (consignación): `aliado2@cueroswears.com` / `Aliado2026!`

## Variables de entorno

Ver `.env.example`. Lo mínimo indispensable es `DATABASE_URL` y
`SESSION_SECRET` (clave para firmar las sesiones — genera una propia con
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

Las variables de `SMTP_*` / `WHATSAPP_*` son opcionales: sin ellas, la app
funciona igual y solo deja de enviar notificaciones externas.

## Base de datos

Por defecto usa **SQLite** (archivo `dev.db`) para poder arrancar sin
infraestructura adicional. Para producción con más de un servidor o en
plataformas serverless (Vercel, etc.) se recomienda migrar a Postgres:

1. Cambia `provider = "sqlite"` por `provider = "postgresql"` en
   `prisma/schema.prisma`.
2. Cambia el adaptador en `src/lib/prisma.ts` (y `prisma/seed.ts`) de
   `@prisma/adapter-better-sqlite3` a `@prisma/adapter-pg` (`npm install
   @prisma/adapter-pg pg`).
3. Actualiza `DATABASE_URL` a tu cadena de conexión de Postgres y corre
   `npx prisma migrate deploy`.

## Comandos útiles

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build e inicio en producción
- `npm run db:migrate` — aplica migraciones de Prisma
- `npm run db:seed` — carga datos de ejemplo
- `npm run db:studio` — explorador visual de la base de datos

## Marca / diseño

La paleta de marca (cuero, negro, dorado) vive en
`src/app/globals.css` (`--wears-*`). Ajusta esos valores para que
coincidan exactamente con la identidad visual de Cueroswears.com.

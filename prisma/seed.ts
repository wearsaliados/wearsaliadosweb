import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: rawUrl.replace(/^file:/, "") });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cueroswears.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Wears2026!";

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
      name: "Administrador Wears",
      mustChangePw: false,
    },
  });
  console.log(`Admin listo: ${adminUser.email} / contraseña: ${adminPassword}`);

  const web = await prisma.location.upsert({
    where: { id: "loc-web" },
    update: {},
    create: { id: "loc-web", name: "Tienda en línea (Cueroswears.com)", type: "WEB" },
  });
  const store = await prisma.location.upsert({
    where: { id: "loc-store-1" },
    update: {},
    create: { id: "loc-store-1", name: "Punto físico principal", type: "STORE", address: "Sede principal" },
  });
  const factory = await prisma.location.upsert({
    where: { id: "loc-factory" },
    update: {},
    create: { id: "loc-factory", name: "Fábrica (lista para reposición)", type: "FACTORY" },
  });

  // Limpieza del catálogo de demostración anterior (reemplazado por el catálogo real)
  const oldSkus = ["WR-BOT-001", "WR-BOT-002", "WR-BOL-001", "WR-CIN-001", "WR-MOR-001", "WR-PROX-001"];
  const oldProducts = await prisma.product.findMany({ where: { sku: { in: oldSkus } } });
  if (oldProducts.length > 0) {
    const oldProductIds = oldProducts.map((p) => p.id);
    const oldItems = await prisma.inventoryItem.findMany({ where: { productId: { in: oldProductIds } } });
    const oldItemIds = oldItems.map((i) => i.id);
    await prisma.inventoryMovement.deleteMany({ where: { inventoryItemId: { in: oldItemIds } } });
    await prisma.sale.deleteMany({ where: { productId: { in: oldProductIds } } });
    await prisma.inventoryItem.deleteMany({ where: { productId: { in: oldProductIds } } });
    await prisma.product.deleteMany({ where: { id: { in: oldProductIds } } });
    console.log(`Catálogo de demostración anterior eliminado (${oldProducts.length} productos).`);
  }
  await prisma.collection.deleteMany({ where: { name: { in: ["Clásica Cuero", "Urbana Wears"] } } });

  const herenciaAbuelo = await prisma.collection.upsert({
    where: { name: "Herencia del Abuelo" },
    update: {},
    create: { name: "Herencia del Abuelo" },
  });
  const dressSneakers = await prisma.collection.upsert({
    where: { name: "Dress Sneakers" },
    update: {},
    create: { name: "Dress Sneakers" },
  });
  const velaUrbanNauticos = await prisma.collection.upsert({
    where: { name: "Vela Urban Náuticos" },
    update: {},
    create: { name: "Vela Urban Náuticos" },
  });
  const velaUrbanRinoneras = await prisma.collection.upsert({
    where: { name: "Vela Urban Riñoneras" },
    update: {},
    create: { name: "Vela Urban Riñoneras" },
  });
  const proxColeccion = await prisma.collection.upsert({
    where: { name: "El Barco Wears — Próxima Colección" },
    update: {},
    create: {
      name: "El Barco Wears — Próxima Colección",
      upcoming: true,
      launchNote: "Lanzamiento próximamente. ¡Prepara tu vitrina!",
    },
  });

  // NOTA: los precios de venta (price) son un estimado provisional (costo x2).
  // Ajústalos con los precios reales desde el panel Productos.
  const products = await Promise.all(
    [
      {
        sku: "WR-DEP-001",
        name: "Deportivos Caballeros DS",
        description:
          "Calzado deportivo de cuero de varios tipos y colores, con costuras constructivas y decorativas, confeccionado sobre una suela de caucho o TR de alta calidad con plantilla anatómica para mayor estabilidad y confort. Marca Wears.",
        price: 140,
        cost: 70,
        minStock: 8,
        collectionId: dressSneakers.id,
      },
      {
        sku: "WR-SAN-001",
        name: "Sandalias Herencia del Abuelo",
        description:
          "Sandalias en cuero colores varios con una silueta cruzada contemporánea en diseño, con cierres ajustables y herrajes personalizados de calidad. Colección \"Herencia del Abuelo\".",
        price: 80,
        cost: 40,
        minStock: 10,
        collectionId: herenciaAbuelo.id,
      },
      {
        sku: "WR-NAU-001",
        name: "Náuticos tres ojetes VU",
        description:
          "Mocasín tubular colores varios completamente de cuero cosido sobre una suela de tacón semi-deportiva con cerco de costura decorativa. Colección \"Vela Urban\".",
        price: 80,
        cost: 40,
        minStock: 6,
        collectionId: velaUrbanNauticos.id,
      },
      {
        sku: "WR-RIN-001",
        name: "Riñoneras Vela Urban",
        description:
          "Riñoneras de cuero colores varios de diferentes texturas, con logo grabado en relieve, costuras decorativas y herrajes de calidad. Colección \"Vela Urban\".",
        price: 80,
        cost: 40,
        minStock: 2,
        collectionId: velaUrbanRinoneras.id,
      },
      {
        sku: "WR-PROX-002",
        name: "Próxima colección (por anunciar)",
        price: 180,
        cost: 90,
        minStock: 2,
        collectionId: proxColeccion.id,
      },
    ].map((p) => prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p }))
  );
  const [deportivos, sandaliasHDA, nauticos, rinoneras] = products;

  await Promise.all(
    products.map((p, i) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: web.id } },
        update: {},
        create: { productId: p.id, locationId: web.id, quantity: 8 + i, unitCost: p.cost },
      })
    )
  );
  await Promise.all(
    products.map((p, i) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: store.id } },
        update: {},
        create: { productId: p.id, locationId: store.id, quantity: 5 + i, unitCost: p.cost },
      })
    )
  );
  await Promise.all(
    products.map((p, i) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: factory.id } },
        update: {},
        create: { productId: p.id, locationId: factory.id, quantity: 25 + i * 3, unitCost: p.cost },
      })
    )
  );

  async function ensureAlly(opts: {
    email: string;
    password: string;
    businessName: string;
    contactName: string;
    phone?: string;
    city?: string;
    mustChangePw?: boolean;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: opts.email } });
    if (existing) {
      const ally = await prisma.ally.findUniqueOrThrow({ where: { userId: existing.id } });
      return { ally, isNew: false };
    }

    const user = await prisma.user.create({
      data: {
        email: opts.email,
        passwordHash: await bcrypt.hash(opts.password, 10),
        role: "ALLY",
        name: opts.contactName,
        mustChangePw: opts.mustChangePw ?? true,
      },
    });
    const ally = await prisma.ally.create({
      data: {
        userId: user.id,
        businessName: opts.businessName,
        contactName: opts.contactName,
        phone: opts.phone || null,
        city: opts.city || null,
      },
    });
    await prisma.location.create({
      data: { name: opts.businessName, type: "ALLY", allyId: ally.id },
    });
    console.log(`Aliado creado: ${opts.email} / contraseña: ${opts.password}`);
    return { ally, isNew: true };
  }

  const { ally: ally1, isNew: ally1IsNew } = await ensureAlly({
    email: "aliado1@cueroswears.com",
    password: "Aliado2026!",
    businessName: "Boutique El Puerto",
    contactName: "María Gómez",
    phone: "3001234567",
    city: "Cartagena",
  });
  const { ally: ally2, isNew: ally2IsNew } = await ensureAlly({
    email: "aliado2@cueroswears.com",
    password: "Aliado2026!",
    businessName: "Estilo Urbano Store",
    contactName: "Carlos Pérez",
    phone: "3007654321",
    city: "Bogotá",
  });

  if (ally1IsNew) {
    const loc1 = await prisma.location.findUniqueOrThrow({ where: { allyId: ally1.id } });
    for (const [i, p] of [deportivos, sandaliasHDA, nauticos].entries()) {
      await prisma.inventoryItem.create({
        data: {
          productId: p.id,
          locationId: loc1.id,
          quantity: i === 0 ? 1 : 4,
          acquisitionType: "PURCHASE",
          unitCost: p.cost,
        },
      });
    }
  }

  if (ally2IsNew) {
    const loc2 = await prisma.location.findUniqueOrThrow({ where: { allyId: ally2.id } });
    for (const p of [sandaliasHDA, nauticos, rinoneras]) {
      await prisma.inventoryItem.create({
        data: {
          productId: p.id,
          locationId: loc2.id,
          quantity: 3,
          acquisitionType: "CONSIGNMENT",
          unitCost: p.cost,
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          allyId: ally2.id,
          type: "CONSIGNMENT_CHARGE",
          amount: p.cost * 3,
          description: `Mercancía a consignación: ${p.name} x3`,
        },
      });
    }
  }

  // Primer aliado comercial oficial: C.C. Sambil
  const { ally: sambil, isNew: sambilIsNew } = await ensureAlly({
    email: "makewakesccsambil",
    password: "308449318",
    businessName: "C.C. Sambil",
    contactName: "C.C. Sambil",
    mustChangePw: false,
  });

  if (sambilIsNew) {
    const locSambil = await prisma.location.findUniqueOrThrow({ where: { allyId: sambil.id } });

    // Inventario inicial entregado a consignación
    const initialConsignment = [
      { product: deportivos, quantity: 35 },
      { product: sandaliasHDA, quantity: 42 },
      { product: nauticos, quantity: 28 },
      { product: rinoneras, quantity: 8 },
    ];

    for (const { product, quantity } of initialConsignment) {
      const item = await prisma.inventoryItem.create({
        data: {
          productId: product.id,
          locationId: locSambil.id,
          quantity,
          acquisitionType: "CONSIGNMENT",
          unitCost: product.cost,
        },
      });
      await prisma.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          type: "RECEIVE",
          quantityDelta: quantity,
          note: "Inventario inicial a consignación",
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          allyId: sambil.id,
          type: "CONSIGNMENT_CHARGE",
          amount: quantity * product.cost,
          description: `Mercancía a consignación: ${product.name} x${quantity}`,
        },
      });
    }

    // 4 pares adicionales de Sandalias Herencia del Abuelo, vendidos y pagados de inmediato a Wears
    const extraQuantity = 4;
    const hdaItem = await prisma.inventoryItem.update({
      where: { productId_locationId: { productId: sandaliasHDA.id, locationId: locSambil.id } },
      data: { quantity: { increment: extraQuantity } },
    });
    await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: hdaItem.id,
        type: "RECEIVE",
        quantityDelta: extraQuantity,
        note: "Recepción adicional — venta directa ya pagada",
      },
    });
    const extraCharge = extraQuantity * sandaliasHDA.cost;
    await prisma.ledgerEntry.create({
      data: {
        allyId: sambil.id,
        type: "CONSIGNMENT_CHARGE",
        amount: extraCharge,
        description: `Mercancía a consignación: ${sandaliasHDA.name} x${extraQuantity}`,
      },
    });

    await prisma.inventoryItem.update({
      where: { productId_locationId: { productId: sandaliasHDA.id, locationId: locSambil.id } },
      data: { quantity: { decrement: extraQuantity } },
    });
    await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: hdaItem.id,
        type: "SALE",
        quantityDelta: -extraQuantity,
        note: "Venta inicial pagada directamente a Wears",
      },
    });
    await prisma.sale.create({
      data: {
        allyId: sambil.id,
        locationId: locSambil.id,
        productId: sandaliasHDA.id,
        quantity: extraQuantity,
        unitPrice: sandaliasHDA.price,
        note: "Venta inicial pagada directamente a Wears",
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        allyId: sambil.id,
        type: "PAYMENT",
        amount: extraCharge,
        description: `Pago recibido — ${extraQuantity} pares de ${sandaliasHDA.name} vendidos y liquidados`,
      },
    });

    console.log(
      `Aliado oficial C.C. Sambil creado con inventario inicial a consignación y ${extraQuantity} unidades vendidas ya pagadas.`
    );
  }

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

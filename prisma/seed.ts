import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type SizedVariant = {
  sku: string;
  name: string;
  size: string;
  price: number;
  cost: number;
  manufacturingCost: number;
  minStock: number;
  collectionId: string;
};

/** Genera un producto por cada combinación modelo x talla (cada talla es una unidad de inventario propia). */
function buildSizedModels(opts: {
  skuPrefix: string;
  models: string[];
  sizes: string[];
  price: number;
  cost: number;
  manufacturingCost: number;
  minStock: number;
  collectionId: string;
  quantityPerVariant?: number;
}): SizedVariant[] {
  const variants: SizedVariant[] = [];
  for (const model of opts.models) {
    for (const size of opts.sizes) {
      variants.push({
        sku: `WR-${opts.skuPrefix}-${slugify(model)}-${size}`,
        name: size === "Única" ? model : `${model} — Talla ${size}`,
        size,
        price: opts.price,
        cost: opts.cost,
        manufacturingCost: opts.manufacturingCost,
        minStock: opts.minStock,
        collectionId: opts.collectionId,
      });
    }
  }
  return variants;
}

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

  // Limpieza del catálogo de demostración muy antiguo (ya reemplazado por el catálogo real)
  const veryOldSkus = ["WR-BOT-001", "WR-BOT-002", "WR-BOL-001", "WR-CIN-001", "WR-MOR-001", "WR-PROX-001", "WR-RIN-001"];
  const veryOldProducts = await prisma.product.findMany({ where: { sku: { in: veryOldSkus } } });
  if (veryOldProducts.length > 0) {
    const ids = veryOldProducts.map((p) => p.id);
    const items = await prisma.inventoryItem.findMany({ where: { productId: { in: ids } } });
    const itemIds = items.map((i) => i.id);
    await prisma.inventoryMovement.deleteMany({ where: { inventoryItemId: { in: itemIds } } });
    await prisma.sale.deleteMany({ where: { productId: { in: ids } } });
    await prisma.inventoryItem.deleteMany({ where: { productId: { in: ids } } });
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.collection.deleteMany({ where: { name: { in: ["Clásica Cuero", "Urbana Wears"] } } });

  // Renombra colecciones ya existentes en vez de duplicarlas
  await prisma.collection.updateMany({
    where: { name: "Dress Sneakers" },
    data: { name: "Deportivos Dress Sneakers" },
  });
  await prisma.collection.updateMany({
    where: { name: "Vela Urban Náuticos" },
    data: { name: "Náuticos Vela Urban" },
  });
  await prisma.collection.updateMany({
    where: { name: "Vela Urban Riñoneras" },
    data: { name: "Riñoneras Vela Urban" },
  });
  await prisma.collection.updateMany({
    where: { name: "El Barco Wears — Próxima Colección" },
    data: {
      name: "M Jane",
      imageUrl: "/brand/mjane.jpg",
      launchNote:
        "Calzado de dama, 3 colores. Pídelos con antelación — pedido mínimo 15 pares (una unidad de cada color y talla).",
    },
  });

  const herenciaAbuelo = await prisma.collection.upsert({
    where: { name: "Herencia del Abuelo" },
    update: {},
    create: { name: "Herencia del Abuelo" },
  });
  const dressSneakers = await prisma.collection.upsert({
    where: { name: "Deportivos Dress Sneakers" },
    update: {},
    create: { name: "Deportivos Dress Sneakers" },
  });
  const velaUrbanNauticos = await prisma.collection.upsert({
    where: { name: "Náuticos Vela Urban" },
    update: {},
    create: { name: "Náuticos Vela Urban" },
  });
  const velaUrbanRinoneras = await prisma.collection.upsert({
    where: { name: "Riñoneras Vela Urban" },
    update: {},
    create: { name: "Riñoneras Vela Urban" },
  });
  const mJane = await prisma.collection.upsert({
    where: { name: "M Jane" },
    update: { imageUrl: "/brand/mjane.jpg" },
    create: {
      name: "M Jane",
      upcoming: true,
      imageUrl: "/brand/mjane.jpg",
      launchNote:
        "Calzado de dama, 3 colores. Pídelos con antelación — pedido mínimo 15 pares (una unidad de cada color y talla).",
    },
  });
  const c4bos = await prisma.collection.upsert({
    where: { name: "C4bos" },
    update: {},
    create: { name: "C4bos" },
  });
  const feline = await prisma.collection.upsert({
    where: { name: "Feline" },
    update: {},
    create: { name: "Feline" },
  });
  const correasC4bos = await prisma.collection.upsert({
    where: { name: "Correas C4bos" },
    update: {},
    create: { name: "Correas C4bos" },
  });
  const correasMJane = await prisma.collection.upsert({
    where: { name: "Correas M Jane" },
    update: {},
    create: { name: "Correas M Jane" },
  });
  const correasFeline = await prisma.collection.upsert({
    where: { name: "Correas Feline" },
    update: {},
    create: { name: "Correas Feline" },
  });

  // Catálogo "genérico" anterior (un producto por colección, sin talla). Se deja inactivo:
  // ya no se usa para asignar inventario nuevo, pero se conserva por el historial de ventas
  // y de los aliados de demostración que ya lo tenían asignado.
  const legacyProducts = await Promise.all(
    [
      {
        sku: "WR-DEP-001",
        name: "Deportivos Caballeros DS",
        price: 140,
        cost: 70,
        manufacturingCost: 50,
        minStock: 8,
        collectionId: dressSneakers.id,
      },
      {
        sku: "WR-SAN-001",
        name: "Sandalias Herencia del Abuelo",
        price: 70,
        cost: 40,
        manufacturingCost: 25,
        minStock: 10,
        collectionId: herenciaAbuelo.id,
      },
      {
        sku: "WR-NAU-001",
        name: "Náuticos tres ojetes VU",
        price: 75,
        cost: 40,
        manufacturingCost: 25,
        minStock: 6,
        collectionId: velaUrbanNauticos.id,
      },
    ].map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: { price: p.price, cost: p.cost, manufacturingCost: p.manufacturingCost },
        create: p,
      })
    )
  );
  await prisma.product.updateMany({
    where: { sku: { in: legacyProducts.map((p) => p.sku) } },
    data: { active: false },
  });
  const [deportivos, sandaliasHDA, nauticos] = legacyProducts;

  await Promise.all(
    legacyProducts.map((p) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: web.id } },
        update: {},
        create: { productId: p.id, locationId: web.id, quantity: 0, unitCost: p.cost },
      })
    )
  );
  await Promise.all(
    legacyProducts.map((p) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: store.id } },
        update: {},
        create: { productId: p.id, locationId: store.id, quantity: 0, unitCost: p.cost },
      })
    )
  );
  await Promise.all(
    legacyProducts.map((p) =>
      prisma.inventoryItem.upsert({
        where: { productId_locationId: { productId: p.id, locationId: factory.id } },
        update: {},
        create: { productId: p.id, locationId: factory.id, quantity: 0, unitCost: p.cost },
      })
    )
  );

  // NOTA: los precios de venta (price) de todo el catálogo son un estimado provisional.
  // Ajústalos con los precios reales desde el panel Productos.
  const sizedVariantDefs: SizedVariant[] = [
    ...buildSizedModels({
      skuPrefix: "DEP",
      models: ["Dallas real", "Gitano verde", "Espartano azul", "Espartano negro", "Hanton miel"],
      sizes: ["39", "40", "41", "42", "43", "44", "45"],
      price: 140,
      cost: 70,
      manufacturingCost: 50,
      minStock: 1,
      collectionId: dressSneakers.id,
    }),
    ...buildSizedModels({
      skuPrefix: "SAN",
      models: ["Beige cierres", "Azul cierres", "Marrón cierres", "Correa negra", "Correa oro", "Correa caramelo", "Correa vaqueta"],
      sizes: ["38", "39", "40", "41", "42", "43", "44"],
      price: 70,
      cost: 40,
      manufacturingCost: 25,
      minStock: 1,
      collectionId: herenciaAbuelo.id,
    }),
    ...buildSizedModels({
      skuPrefix: "NAU",
      models: ["Náuticos Caramelo", "Náuticos Azul", "Náuticos Rojo", "Náuticos Verde"],
      sizes: ["38", "39", "40", "41", "42", "43", "44"],
      price: 75,
      cost: 40,
      manufacturingCost: 25,
      minStock: 1,
      collectionId: velaUrbanNauticos.id,
    }),
    ...buildSizedModels({
      skuPrefix: "RIN",
      models: ["Riñonera Caramelo", "Riñonera Azul", "Riñonera Rojo", "Riñonera Verde"],
      sizes: ["Única"],
      price: 75,
      cost: 40,
      manufacturingCost: 25,
      minStock: 1,
      collectionId: velaUrbanRinoneras.id,
    }),
    // M Jane: calzado de dama, 3 colores
    ...buildSizedModels({
      skuPrefix: "MJ",
      models: ["M Jane Rojo", "M Jane Blanco", "M Jane Verde"],
      sizes: ["35", "36", "37", "38", "39"],
      price: 90,
      cost: 55,
      manufacturingCost: 30,
      minStock: 1,
      collectionId: mJane.id,
    }),
    // C4bos: calzado de dama, 2 colores
    ...buildSizedModels({
      skuPrefix: "C4B",
      models: ["Miel crema", "Beige arena"],
      sizes: ["35", "36", "37", "38", "39"],
      price: 100,
      cost: 60,
      manufacturingCost: 40,
      minStock: 1,
      collectionId: c4bos.id,
    }),
    // Feline: calzado de dama print animal, 3 colores
    ...buildSizedModels({
      skuPrefix: "FEL",
      models: ["Pelo print chita negro", "Pelo print leopardo", "Borgoña"],
      sizes: ["35", "36", "37", "38", "39"],
      price: 100,
      cost: 60,
      manufacturingCost: 40,
      minStock: 1,
      collectionId: feline.id,
    }),
    // Correas C4bos: mismos colores, tallas M/L/XL/XXL
    ...buildSizedModels({
      skuPrefix: "CC4",
      models: ["Correa C4bos Miel crema", "Correa C4bos Beige arena"],
      sizes: ["M", "L", "XL", "XXL"],
      price: 40,
      cost: 30,
      manufacturingCost: 20,
      minStock: 1,
      collectionId: correasC4bos.id,
    }),
    // Correas M Jane: mismos colores, tallas M/L/XL/XXL
    ...buildSizedModels({
      skuPrefix: "CMJ",
      models: ["Correa M Jane Verde", "Correa M Jane Rojo", "Correa M Jane Blanco"],
      sizes: ["M", "L", "XL", "XXL"],
      price: 40,
      cost: 30,
      manufacturingCost: 20,
      minStock: 1,
      collectionId: correasMJane.id,
    }),
    // Correas Feline: mismos colores, tallas M/L/XL/XXL
    ...buildSizedModels({
      skuPrefix: "CFE",
      models: [
        "Correa Feline Pelo print chita negro",
        "Correa Feline Pelo print leopardo",
        "Correa Feline Borgoña",
      ],
      sizes: ["M", "L", "XL", "XXL"],
      price: 40,
      cost: 30,
      manufacturingCost: 20,
      minStock: 1,
      collectionId: correasFeline.id,
    }),
  ];

  const sizedProducts = await Promise.all(
    sizedVariantDefs.map((v) =>
      prisma.product.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name,
          size: v.size,
          collectionId: v.collectionId,
          cost: v.cost,
          manufacturingCost: v.manufacturingCost,
          price: v.price,
        },
        create: v,
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

  // Primer aliado comercial oficial: Make Waves C.C. Sambil Chacao
  const { ally: sambil, isNew: sambilIsNew } = await ensureAlly({
    email: "makewakesccsambil",
    password: "308449318",
    businessName: "Make Waves C.C. Sambil Chacao",
    contactName: "Make Waves C.C. Sambil Chacao",
    mustChangePw: false,
  });

  if (sambilIsNew) {
    const locSambil = await prisma.location.findUniqueOrThrow({ where: { allyId: sambil.id } });

    // Inventario inicial entregado a consignación (registrado a nivel de colección;
    // el detalle por modelo y talla se agrega justo debajo)
    const initialConsignment: { product: { name: string; cost: number }; quantity: number }[] = [
      { product: deportivos, quantity: 35 },
      { product: sandaliasHDA, quantity: 42 },
      { product: nauticos, quantity: 28 },
      // "Riñoneras Vela Urban" ya no tiene un producto genérico WR-RIN-001 propio;
      // este cargo histórico de consignación se conserva con el mismo nombre y costo.
      { product: { name: "Riñoneras Vela Urban", cost: 40 }, quantity: 8 },
    ];

    for (const { product, quantity } of initialConsignment) {
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
    const extraCharge = extraQuantity * sandaliasHDA.cost;
    await prisma.ledgerEntry.create({
      data: {
        allyId: sambil.id,
        type: "CONSIGNMENT_CHARGE",
        amount: extraCharge,
        description: `Mercancía a consignación: ${sandaliasHDA.name} x${extraQuantity}`,
      },
    });
    await prisma.sale.create({
      data: {
        allyId: sambil.id,
        locationId: locSambil.id,
        productId: sandaliasHDA.id,
        quantity: extraQuantity,
        unitPrice: sandaliasHDA.price,
        unitCost: sandaliasHDA.cost,
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
      `Aliado oficial Make Waves C.C. Sambil Chacao creado, con ${extraQuantity} unidades de Herencia del Abuelo vendidas y ya pagadas.`
    );
  }

  // Migración del inventario de Sambil al detalle por modelo y talla (una sola vez).
  const locSambil = await prisma.location.findUnique({ where: { allyId: sambil.id } });
  if (locSambil) {
    const currentItemCount = await prisma.inventoryItem.count({ where: { locationId: locSambil.id } });
    if (currentItemCount <= 4) {
      const oldItems = await prisma.inventoryItem.findMany({
        where: { locationId: locSambil.id },
        select: { id: true },
      });
      await prisma.inventoryMovement.deleteMany({
        where: { inventoryItemId: { in: oldItems.map((i) => i.id) } },
      });
      await prisma.inventoryItem.deleteMany({ where: { locationId: locSambil.id } });

      const bySkuPrefix = (prefix: string) =>
        sizedProducts.filter((p) => p.sku.startsWith(`WR-${prefix}-`));

      const detailed: { product: (typeof sizedProducts)[number]; quantity: number }[] = [
        ...bySkuPrefix("DEP").map((product) => ({ product, quantity: 1 })),
        // "Correa vaqueta" no formaba parte del inventario inicial de Sambil
        // (solo llegó después, directo a fábrica) — se excluye aquí.
        ...bySkuPrefix("SAN")
          .filter((p) => !p.sku.includes("CORREA-VAQUETA"))
          .map((product) => ({ product, quantity: 1 })),
        ...bySkuPrefix("NAU").map((product) => ({ product, quantity: 1 })),
        ...bySkuPrefix("RIN").map((product) => ({ product, quantity: 2 })),
      ];

      for (const { product, quantity } of detailed) {
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
            note: "Inventario inicial a consignación (detalle por modelo y talla)",
          },
        });
      }

      const totalUnits = detailed.reduce((s, d) => s + d.quantity, 0);
      console.log(
        `Inventario de Sambil migrado a detalle por modelo y talla: ${detailed.length} variantes, ${totalUnits} unidades.`
      );
    }
  }

  // Carga del inventario real de fábrica (una sola vez), por modelo y talla exacta.
  function sizeCounts(sizesCsv: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const raw of sizesCsv.split(",")) {
      const s = raw.trim();
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }

  const factoryStockDefs: {
    skuPrefix: string;
    model: string;
    sizesCsv?: string;
    counts?: Record<string, number>;
  }[] = [
    { skuPrefix: "DEP", model: "Dallas real", sizesCsv: "39,40,41,41,42,42,42,42,43,43,43,43" },
    { skuPrefix: "DEP", model: "Gitano verde", sizesCsv: "39,40,40,41,41,42,42,42,43,43,43,43,43,43,44,45" },
    { skuPrefix: "DEP", model: "Espartano azul", sizesCsv: "41,42,42,42,43,43" },
    { skuPrefix: "DEP", model: "Espartano negro", sizesCsv: "42,42,42,43,43,43" },
    { skuPrefix: "DEP", model: "Hanton miel", sizesCsv: "39,39,41,41,42,42,43,43" },
    { skuPrefix: "SAN", model: "Beige cierres", sizesCsv: "38,39,39,39,39,39,39,39,39,40,40,40,40,40,40,40,41,41,41,43" },
    { skuPrefix: "SAN", model: "Azul cierres", sizesCsv: "39,39,39,39,39,39,39,40,40,41,41" },
    { skuPrefix: "SAN", model: "Marrón cierres", sizesCsv: "38,39,39,39,39,39,40,40,40,40,41,41,41,41,42,42,42" },
    { skuPrefix: "SAN", model: "Correa negra", sizesCsv: "38,39,39,39,40,40,41,41,41,42,42,43,43" },
    { skuPrefix: "SAN", model: "Correa oro", sizesCsv: "38,39,39,39,40,40,41,41,41,42,42,42,43,43,44,44" },
    { skuPrefix: "SAN", model: "Correa vaqueta", sizesCsv: "39,39,39,40,40,41,41,41,42,42,42,43,43,44,44" },
    { skuPrefix: "NAU", model: "Náuticos Caramelo", sizesCsv: "38,39,40,40,40,41,41,41,42,42,42,43,43,43,44,44,44" },
    { skuPrefix: "NAU", model: "Náuticos Azul", sizesCsv: "38,39,40,40,40,41,41,41,42,42,42,43,43,43,44,44,44" },
    { skuPrefix: "NAU", model: "Náuticos Rojo", sizesCsv: "38,39,40,40,40,41,41,41,42,42,42,43,43,43,44,44,44" },
    { skuPrefix: "NAU", model: "Náuticos Verde", sizesCsv: "38,39,40,40,40,41,41,41,42,42,42,43,43,43,44,44,44" },
    // Colecciones de dama (inventario real de fábrica)
    { skuPrefix: "MJ", model: "M Jane Verde", sizesCsv: "35,35,35,36,36,36,37,37,37,38,38,39" },
    { skuPrefix: "MJ", model: "M Jane Rojo", sizesCsv: "35,35,35,36,36,36,37,37,37,38,38,39" },
    { skuPrefix: "MJ", model: "M Jane Blanco", sizesCsv: "35,35,35,36,36,36,37,37,37,38,38,39" },
    { skuPrefix: "C4B", model: "Miel crema", counts: { "35": 20, "36": 20, "37": 20, "38": 10, "39": 10 } },
    { skuPrefix: "C4B", model: "Beige arena", counts: { "35": 20, "36": 20, "37": 20, "38": 10, "39": 10 } },
    { skuPrefix: "FEL", model: "Pelo print chita negro", sizesCsv: "35,35,35,36,36,36,37,37,37,38,38,39" },
    { skuPrefix: "FEL", model: "Pelo print leopardo", sizesCsv: "35,35,35,36,36,36,37,37,37,38,38,39" },
    { skuPrefix: "FEL", model: "Borgoña", sizesCsv: "35,35,35,36,36,36,37,37,37,38,38,39" },
    {
      skuPrefix: "CC4",
      model: "Correa C4bos Miel crema",
      counts: { M: 20, L: 20, XL: 20, XXL: 20 },
    },
    {
      skuPrefix: "CC4",
      model: "Correa C4bos Beige arena",
      counts: { M: 20, L: 20, XL: 20, XXL: 20 },
    },
    { skuPrefix: "CMJ", model: "Correa M Jane Verde", sizesCsv: "M,M,M,L,L,L,XL,XL,XL,XXL,XXL,XXL" },
    { skuPrefix: "CMJ", model: "Correa M Jane Rojo", sizesCsv: "M,M,M,L,L,L,XL,XL,XL,XXL,XXL,XXL" },
    { skuPrefix: "CMJ", model: "Correa M Jane Blanco", sizesCsv: "M,M,M,L,L,L,XL,XL,XL,XXL,XXL,XXL" },
    {
      skuPrefix: "CFE",
      model: "Correa Feline Pelo print chita negro",
      sizesCsv: "M,M,M,L,L,L,XL,XL,XL,XXL,XXL,XXL",
    },
    {
      skuPrefix: "CFE",
      model: "Correa Feline Pelo print leopardo",
      sizesCsv: "M,M,M,L,L,L,XL,XL,XL,XXL,XXL,XXL",
    },
    { skuPrefix: "CFE", model: "Correa Feline Borgoña", sizesCsv: "M,M,M,L,L,L,XL,XL,XL,XXL,XXL,XXL" },
  ];

  const factoryMarkerSku = `WR-DEP-${slugify("Dallas real")}-39`;
  const factoryAlreadyLoaded = await prisma.inventoryItem.findFirst({
    where: { locationId: factory.id, product: { sku: factoryMarkerSku }, quantity: { gt: 0 } },
  });

  if (!factoryAlreadyLoaded) {
    let factoryVariants = 0;
    let factoryUnits = 0;
    for (const def of factoryStockDefs) {
      const counts = def.counts ?? sizeCounts(def.sizesCsv!);
      for (const [size, quantity] of Object.entries(counts)) {
        const sku = `WR-${def.skuPrefix}-${slugify(def.model)}-${size}`;
        const product = sizedProducts.find((p) => p.sku === sku);
        if (!product) continue;

        const item = await prisma.inventoryItem.upsert({
          where: { productId_locationId: { productId: product.id, locationId: factory.id } },
          update: { quantity: { increment: quantity } },
          create: { productId: product.id, locationId: factory.id, quantity, unitCost: product.cost },
        });
        await prisma.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            type: "RECEIVE",
            quantityDelta: quantity,
            note: "Inventario real de fábrica para reposición",
          },
        });
        factoryVariants += 1;
        factoryUnits += quantity;
      }
    }
    console.log(
      `Inventario de fábrica cargado: ${factoryVariants} variantes, ${factoryUnits} unidades.`
    );
  }

  // ============================================================
  // Inventario real de la tienda física principal + colecciones nuevas
  // ============================================================
  const newCollectionDefs: { key: string; name: string }[] = [
    { key: "nauticosClasicos", name: "Náuticos Clásicos" },
    { key: "nauticosKids", name: "Náuticos Kids" },
    { key: "drivers", name: "Driver's" },
    { key: "correasWatch", name: "Correas Apple Watch" },
    { key: "carterasDamas", name: "Carteras Damas" },
    { key: "carriel", name: "Carriel" },
    { key: "correasDS", name: "Correas DS" },
    { key: "correasCaballero", name: "Correas de Caballero" },
    { key: "dressSneakersAntigua", name: "Deportivos Dress Sneakers (colección antigua)" },
    { key: "rinoneras", name: "Riñoneras" },
  ];
  const newCollections: Record<string, { id: string }> = {};
  for (const def of newCollectionDefs) {
    newCollections[def.key] = await prisma.collection.upsert({
      where: { name: def.name },
      update: {},
      create: { name: def.name },
    });
  }

  async function ensureProduct(opts: {
    sku: string;
    model: string;
    size: string | null;
    price: number;
    cost: number;
    manufacturingCost: number;
    collectionId: string;
  }) {
    const name = opts.size && opts.size !== "Única" ? `${opts.model} — Talla ${opts.size}` : opts.model;
    return prisma.product.upsert({
      where: { sku: opts.sku },
      update: {
        price: opts.price,
        cost: opts.cost,
        manufacturingCost: opts.manufacturingCost,
        collectionId: opts.collectionId,
      },
      create: {
        sku: opts.sku,
        name,
        size: opts.size,
        price: opts.price,
        cost: opts.cost,
        manufacturingCost: opts.manufacturingCost,
        minStock: 1,
        collectionId: opts.collectionId,
      },
    });
  }

  const STORE_NOTE = "Inventario real de tienda física principal";

  async function receiveAtStore(productId: string, quantity: number, cost: number) {
    if (quantity <= 0) return;
    const item = await prisma.inventoryItem.upsert({
      where: { productId_locationId: { productId, locationId: store.id } },
      update: { quantity: { increment: quantity } },
      create: { productId, locationId: store.id, quantity, unitCost: cost },
    });
    await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: "RECEIVE",
        quantityDelta: quantity,
        note: STORE_NOTE,
      },
    });
  }

  function toStoreEntries(skuPrefix: string, model: string, sizesCsv: string, cost: number) {
    const counts = sizeCounts(sizesCsv);
    return Object.entries(counts).map(([size, quantity]) => ({
      sku: `${skuPrefix}-${slugify(model)}-${size}`,
      quantity,
      cost,
    }));
  }

  const storeMarkerSku = `WR-DEP-${slugify("Espartano negro")}-41`;
  const storeAlreadyLoaded = await prisma.inventoryItem.findFirst({
    where: { locationId: store.id, product: { sku: storeMarkerSku }, quantity: { gt: 0 } },
  });

  if (!storeAlreadyLoaded) {
    // --- Modelos existentes: sumar el stock real de tienda a sus productos ya creados ---
    const existingStoreStock: { sku: string; quantity: number; cost: number }[] = [
      // Deportivos Dress Sneakers (costo 70)
      ...toStoreEntries("WR-DEP", "Espartano negro", "41,43,43,43,44,44", 70),
      ...toStoreEntries("WR-DEP", "Espartano azul", "40,40,41,42,43,44,44,45", 70),
      ...toStoreEntries("WR-DEP", "Gitano verde", "39,39,40,41,42,43,44", 70),
      ...toStoreEntries("WR-DEP", "Hanton miel", "39,40,41,42,43,45", 70),
      ...toStoreEntries("WR-DEP", "Dallas real", "39,39,40,41,42,42,42,42,43,44,45", 70),
      // Náuticos Vela Urban (costo 40)
      ...toStoreEntries("WR-NAU", "Náuticos Azul", "38,39,40,41,41", 40),
      ...toStoreEntries("WR-NAU", "Náuticos Rojo", "38,39,40,40,41,41,41", 40),
      ...toStoreEntries("WR-NAU", "Náuticos Caramelo", "38,39,40,40,40,41,41,41", 40),
      ...toStoreEntries("WR-NAU", "Náuticos Verde", "38,39,40,40,41,41,41,42,42,42,43", 40),
      // Herencia del Abuelo (costo 40)
      ...toStoreEntries("WR-SAN", "Correa negra", "39,39,39,39,40,40,41,41,42,42,43,43", 40),
      ...toStoreEntries("WR-SAN", "Correa oro", "38,39,39,40,40,40,41,41,41,42,43,43,44", 40),
      ...toStoreEntries("WR-SAN", "Correa vaqueta", "38,39,40,40,42,42,43,44", 40),
      ...toStoreEntries("WR-SAN", "Beige cierres", "38,38,39,40,41,42,42,43", 40),
      ...toStoreEntries("WR-SAN", "Azul cierres", "38,39,39,40,40,41,41,42,43,43,44,44", 40),
    ];
    for (const entry of existingStoreStock) {
      const product = sizedProducts.find((p) => p.sku === entry.sku);
      if (product) await receiveAtStore(product.id, entry.quantity, entry.cost);
    }

    // Riñoneras Vela Urban (Única, costo 40) — ya existen como productos
    const rinStore: { model: string; quantity: number }[] = [
      { model: "Riñonera Caramelo", quantity: 5 },
      { model: "Riñonera Verde", quantity: 6 },
      { model: "Riñonera Azul", quantity: 7 },
      { model: "Riñonera Rojo", quantity: 9 },
    ];
    for (const r of rinStore) {
      const sku = `WR-RIN-${slugify(r.model)}-Única`;
      const product = sizedProducts.find((p) => p.sku === sku);
      if (product) await receiveAtStore(product.id, r.quantity, 40);
    }

    // --- "Chocolate cierres" es el mismo modelo que "Marrón cierres" (Herencia del Abuelo) ---
    const marronCierresStock = sizeCounts("38,39,39,40,40,41,41,41,42,42,43,43,44");
    for (const [size, qty] of Object.entries(marronCierresStock)) {
      const sku = `WR-SAN-${slugify("Marrón cierres")}-${size}`;
      const product = sizedProducts.find((p) => p.sku === sku);
      if (product) await receiveAtStore(product.id, qty, 40);
    }

    // --- Nuevo color de riñonera: Chocolate (colección nueva "Riñoneras") ---
    {
      const sku = `WR-RIN-${slugify("Riñonera Chocolate")}-UNICA`;
      const product = await ensureProduct({
        sku,
        model: "Riñonera Chocolate",
        size: "Única",
        price: 75,
        cost: 40,
        manufacturingCost: 25,
        collectionId: newCollections.rinoneras.id,
      });
      await receiveAtStore(product.id, 2, 40);
    }

    // --- Náuticos Clásicos (colección nueva, un solo modelo, Única) ---
    {
      const product = await ensureProduct({
        sku: "WR-NAC-MULTICOLOR-UNICA",
        model: "Náuticos Clásicos Multicolor",
        size: "Única",
        price: 60,
        cost: 40,
        manufacturingCost: 25,
        collectionId: newCollections.nauticosClasicos.id,
      });
      await receiveAtStore(product.id, 119, 40);
    }

    // --- Náuticos Kids (colección nueva) ---
    const kidsMiel = sizeCounts("26,32,33");
    for (const [size, qty] of Object.entries(kidsMiel)) {
      const product = await ensureProduct({
        sku: `WR-NKI-MIEL-${size}`,
        model: "Náuticos Kids Miel",
        size,
        price: 60,
        cost: 40,
        manufacturingCost: 25,
        collectionId: newCollections.nauticosKids.id,
      });
      await receiveAtStore(product.id, qty, 40);
    }
    const kidsChoco: Record<string, number> = {
      "26": 2,
      "27": 3,
      "28": 3,
      "29": 1,
      "31": 2,
      "32": 2,
      "33": 3,
    };
    for (const [size, qty] of Object.entries(kidsChoco)) {
      const product = await ensureProduct({
        sku: `WR-NKI-CHOCO-${size}`,
        model: "Náuticos Kids Choco",
        size,
        price: 60,
        cost: 40,
        manufacturingCost: 25,
        collectionId: newCollections.nauticosKids.id,
      });
      await receiveAtStore(product.id, qty, 40);
    }

    // --- Driver's (colección nueva, Única) ---
    {
      const product = await ensureProduct({
        sku: "WR-DRV-DRIVERS-UNICA",
        model: "Driver's",
        size: "Única",
        price: 60,
        cost: 30,
        manufacturingCost: 25,
        collectionId: newCollections.drivers.id,
      });
      await receiveAtStore(product.id, 28, 30);
    }

    // --- Correas Apple Watch (colección nueva, Única por color) ---
    const watchColors: { model: string; quantity: number }[] = [
      { model: "Correa Apple Watch Miel", quantity: 2 },
      { model: "Correa Apple Watch Verde", quantity: 2 },
      { model: "Correa Apple Watch Vinotinto", quantity: 5 },
      { model: "Correa Apple Watch Azul", quantity: 3 },
      { model: "Correa Apple Watch Negro", quantity: 4 },
    ];
    for (const w of watchColors) {
      const product = await ensureProduct({
        sku: `WR-CAW-${slugify(w.model)}-UNICA`,
        model: w.model,
        size: "Única",
        price: 40,
        cost: 30,
        manufacturingCost: 10,
        collectionId: newCollections.correasWatch.id,
      });
      await receiveAtStore(product.id, w.quantity, 30);
    }

    // --- Carteras Damas ---
    const carteras: { model: string; quantity: number }[] = [
      { model: "Cartera Roja", quantity: 1 },
      { model: "Cartera Amarilla", quantity: 1 },
    ];
    for (const c of carteras) {
      const product = await ensureProduct({
        sku: `WR-CAR-${slugify(c.model)}-UNICA`,
        model: c.model,
        size: "Única",
        price: 140,
        cost: 90,
        manufacturingCost: 70,
        collectionId: newCollections.carterasDamas.id,
      });
      await receiveAtStore(product.id, c.quantity, 90);
    }

    // --- Carriel ---
    {
      const product = await ensureProduct({
        sku: "WR-CRL-CARRIEL-CHOCO-UNICA",
        model: "Carriel Choco",
        size: "Única",
        price: 140,
        cost: 90,
        manufacturingCost: 50,
        collectionId: newCollections.carriel.id,
      });
      await receiveAtStore(product.id, 1, 90);
    }

    // --- Correas DS ---
    const correasDSModels: { model: string; quantity: number }[] = [
      { model: "Correa DS Negra espartano", quantity: 8 },
      { model: "Correa DS Verde gitano", quantity: 8 },
      { model: "Correa DS Azul espartano", quantity: 5 },
      { model: "Correa DS Dallas real", quantity: 7 },
      { model: "Correa DS Hanton miel", quantity: 5 },
    ];
    for (const c of correasDSModels) {
      const product = await ensureProduct({
        sku: `WR-CDS-${slugify(c.model)}-UNICA`,
        model: c.model,
        size: "Única",
        price: 40,
        cost: 25,
        manufacturingCost: 20,
        collectionId: newCollections.correasDS.id,
      });
      await receiveAtStore(product.id, c.quantity, 25);
    }

    // --- Correas de Caballero ---
    const correasCaballeroModels: { model: string; quantity: number }[] = [
      { model: "Correa Caballero Azul", quantity: 7 },
      { model: "Correa Caballero Miel", quantity: 5 },
    ];
    for (const c of correasCaballeroModels) {
      const product = await ensureProduct({
        sku: `WR-CCB-${slugify(c.model)}-UNICA`,
        model: c.model,
        size: "Única",
        price: 30,
        cost: 25,
        manufacturingCost: 20,
        collectionId: newCollections.correasCaballero.id,
      });
      await receiveAtStore(product.id, c.quantity, 25);
    }

    // --- Deportivos Dress Sneakers, colección antigua ---
    const antiguaDefs: { model: string; sizesCsv: string }[] = [
      { model: "Sakini verde", sizesCsv: "44,44" },
      { model: "Dember Azul", sizesCsv: "43,44" },
      { model: "Romansi Oro", sizesCsv: "44" },
      { model: "Romansi Rojo", sizesCsv: "44" },
      { model: "Nobuck café beige", sizesCsv: "43" },
      { model: "Black", sizesCsv: "43" },
    ];
    for (const def of antiguaDefs) {
      const counts = sizeCounts(def.sizesCsv);
      for (const [size, qty] of Object.entries(counts)) {
        const product = await ensureProduct({
          sku: `WR-DEA-${slugify(def.model)}-${size}`,
          model: def.model,
          size,
          price: 140,
          cost: 70,
          manufacturingCost: 50,
          collectionId: newCollections.dressSneakersAntigua.id,
        });
        await receiveAtStore(product.id, qty, 70);
      }
    }

    console.log("Inventario real de tienda física principal cargado, junto con las colecciones nuevas.");
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

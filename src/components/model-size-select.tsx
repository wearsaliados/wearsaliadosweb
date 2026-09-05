"use client";

import { useState } from "react";

export type SizedProduct = {
  id: string;
  name: string;
  size: string | null;
  collectionName: string;
};

function modelNameOf(p: SizedProduct) {
  if (p.size && p.size !== "Única") {
    return p.name.replace(` — Talla ${p.size}`, "");
  }
  return p.name;
}

type Props = {
  products: SizedProduct[];
  name: string;
  className?: string;
};

/**
 * Elige primero el modelo (agrupado por colección) y luego la talla, en vez
 * de una sola lista plana de "modelo — talla". El campo que en realidad se
 * envía en el formulario es el segundo select (la talla), con el `name`
 * recibido por props.
 */
export default function ModelSizeSelect({ products, name, className }: Props) {
  const [modelKey, setModelKey] = useState("");
  const [productId, setProductId] = useState("");

  const groups = new Map<string, Map<string, SizedProduct[]>>();
  for (const p of products) {
    const byModel = groups.get(p.collectionName) ?? new Map<string, SizedProduct[]>();
    const model = modelNameOf(p);
    const list = byModel.get(model) ?? [];
    list.push(p);
    byModel.set(model, list);
    groups.set(p.collectionName, byModel);
  }
  const sortedCollections = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const [collectionName, modelName] = modelKey.split("::");
  const variants = (groups.get(collectionName)?.get(modelName) ?? [])
    .slice()
    .sort((a, b) => (a.size ?? "").localeCompare(b.size ?? "", undefined, { numeric: true }));

  return (
    <>
      <select
        value={modelKey}
        onChange={(e) => {
          setModelKey(e.target.value);
          setProductId("");
        }}
        className={className}
      >
        <option value="">Producto</option>
        {sortedCollections.map(([cName, byModel]) => (
          <optgroup key={cName} label={cName}>
            {[...byModel.keys()]
              .sort((a, b) => a.localeCompare(b))
              .map((mName) => (
                <option key={mName} value={`${cName}::${mName}`}>
                  {mName}
                </option>
              ))}
          </optgroup>
        ))}
      </select>

      <select
        name={name}
        required
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className={className}
      >
        <option value="" disabled>
          {variants.length > 0 ? "Talla" : "Elige un producto primero"}
        </option>
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.size && v.size !== "Única" ? `Talla ${v.size}` : v.name}
          </option>
        ))}
      </select>
    </>
  );
}

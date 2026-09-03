import type { SelectHTMLAttributes } from "react";

export type ProductOption = {
  id: string;
  name: string;
  collectionName: string;
  cost?: number;
};

type Props = {
  products: ProductOption[];
  placeholder?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

/** Select de producto agrupado por colección, para encontrarlo más fácil. */
export default function ProductSelect({
  products,
  placeholder = "Producto",
  ...rest
}: Props) {
  const groups = new Map<string, ProductOption[]>();
  for (const p of products) {
    const list = groups.get(p.collectionName) ?? [];
    list.push(p);
    groups.set(p.collectionName, list);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <select {...rest}>
      <option value="" disabled>
        {placeholder}
      </option>
      {sortedGroups.map(([collectionName, items]) => (
        <optgroup key={collectionName} label={collectionName}>
          {items.map((p) => (
            <option key={p.id} value={p.id} data-cost={p.cost}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

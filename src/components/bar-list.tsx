export default function BarList({
  items,
  colorClass = "bg-wears-gold",
  formatValue,
}: {
  items: { name: string; value: number; hint?: string }[];
  colorClass?: string;
  formatValue?: (value: number) => string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-wears-espresso/50">Sin datos todavía.</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.name}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-wears-black">
              {item.name}
              {item.hint && (
                <span className="ml-2 text-xs text-wears-espresso/50">{item.hint}</span>
              )}
            </span>
            <span className="font-medium text-wears-espresso">
              {formatValue ? formatValue(item.value) : item.value}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-wears-sand">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

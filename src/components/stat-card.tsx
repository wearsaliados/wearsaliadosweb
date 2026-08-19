export default function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "critical";
}) {
  const toneClasses =
    tone === "critical"
      ? "border-red-300 bg-red-50"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50"
        : "border-wears-tan/30 bg-white";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClasses}`}>
      <p className="text-xs uppercase tracking-wide text-wears-espresso/60">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-wears-black">{value}</p>
      {hint && <p className="mt-1 text-xs text-wears-espresso/50">{hint}</p>}
    </div>
  );
}

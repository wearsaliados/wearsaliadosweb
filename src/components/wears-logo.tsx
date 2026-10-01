import Image from "next/image";

const SRC = {
  icon: {
    white: "/brand/wears-icon-white-bold.png",
    black: "/brand/wears-icon-black-bold.png",
  },
  full: { white: "/brand/wears-logo-full-white.png", black: "/brand/wears-logo-full-black.png" },
} as const;

export default function WearsAnchorLogo({
  className,
  tone = "white",
  variant = "icon",
}: {
  className?: string;
  tone?: "white" | "black";
  variant?: "icon" | "full";
}) {
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <Image
        src={SRC[variant][tone]}
        alt="Wears"
        fill
        className="object-contain"
        sizes="200px"
      />
    </span>
  );
}

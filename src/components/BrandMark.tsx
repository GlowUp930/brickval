import Image from "next/image";

export function BrandMark({ className = "", textClassName = "text-base", iconClassName = "h-8 w-8" }: {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/brickval-logo.webp"
        alt=""
        aria-hidden="true"
        width={400}
        height={400}
        className={`shrink-0 rounded-[10px] ${iconClassName}`}
      />
      <span className={`font-display font-black tracking-normal ${textClassName}`}>BrickVal</span>
    </div>
  );
}

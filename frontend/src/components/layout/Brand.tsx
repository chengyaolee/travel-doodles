import Link from "next/link";
import Image from "next/image";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Travel Doodles home">
      <span className="brand-mark">
        <Image
          src="/icon-transparent.png"
          alt="Travel Doodles"
          width={38}
          height={38}
          className="w-9 h-9 object-contain dark:invert transition-transform select-none pointer-events-none"
          priority
        />
      </span>
      <span className="brand-wordmark">
        travel<span className="font-hand">doodles</span><span className="brand-period">.</span>
      </span>
    </Link>
  );
}

import Link from "next/link";
import Image from "next/image";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Travel Doodles home">
      <span className="brand-mark">
        <Image
          src="/icon-transparent.png"
          alt="Travel Doodles"
          width={56}
          height={56}
          className="w-12 h-12 md:w-14 md:h-14 object-contain transition-transform select-none pointer-events-none drop-shadow-sm"
          priority
        />
      </span>
      <span className="brand-wordmark">
        travel<span className="font-hand">doodles</span><span className="brand-period">.</span>
      </span>
    </Link>
  );
}

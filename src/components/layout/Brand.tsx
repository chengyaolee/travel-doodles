import Link from "next/link";
import { DoodleGlobe } from "@/components/doodles";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Travel Doodles home">
      <span className="brand-mark"><DoodleGlobe size={38} /></span>
      <span className="brand-wordmark">travel<span className="font-hand">doodles</span><span className="brand-period">.</span></span>
    </Link>
  );
}

import Link from "next/link";
import { Brand } from "./Brand";
import { InkIcon } from "@/components/ui/InkIcon";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div><Brand /><p>A little more world. A little more you.</p></div>
        <nav aria-label="Footer navigation"><Link href="/explore">Explore the world<InkIcon name="arrow" size={16} /></Link><a href="#stories">Community stories</a><a href="#gallery">The gallery</a></nav>
      </div>
      <div className="footer-bottom"><span>© 2026 Travel Doodles</span><span className="font-hand">Made for the memories.</span><a href="#main-content">Back to the beginning ↑</a></div>
    </footer>
  );
}

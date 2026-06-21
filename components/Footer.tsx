import Link from "next/link";
import { BookOpen, Shield } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    platform: [
      { label: "Browse Notes", href: "/#notes" },
      { label: "My Library", href: "/library" },
      { label: "Sign In", href: "/auth" },
    ],
    support: [
      { label: "Contact Us", href: "mailto:support@abhyasmitra.in" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  };

  return (
    <footer className="border-t border-white/5 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow-sm">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-white text-sm">AbhyasMitra</span>
                <span className="text-[10px] font-semibold tracking-widest text-primary-400 uppercase">
                  Premium
                </span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              Premium, subject-wise engineering notes for SPPU students. Study smarter, score higher.
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-500">
              <Shield className="w-3.5 h-3.5 text-primary-500" />
              <span>Payments secured by Razorpay</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              {links.platform.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              {links.support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            &copy; {currentYear} AbhyasMitra Premium. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Made with care for SPPU engineering students
          </p>
        </div>
      </div>
    </footer>
  );
}

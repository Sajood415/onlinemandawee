"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Mail,
  Phone,
  Send,
  ShieldCheck,
  CreditCard,
  CheckCircle,
} from "lucide-react";

/* ── Route map ───────────────────────────────────────────────────────────── */
const LINK_MAP: Record<string, string> = {
  "About Mandawee": "/about",
  "How It Works": "/how-it-works",
  "Vendor Program": "/vendor/register",
  Careers: "/careers",
  "Help Center": "/help",
  "Contact Us": "/contact",
  "Track Order": "/orders",
  "Delivery Areas": "/delivery",
  "Privacy Policy": "/privacy",
  "Terms of Service": "/terms",
  "Refund Policy": "/refunds",
  "Vendor Terms": "/vendor/terms",
};

/* ── Social SVGs ─────────────────────────────────────────────────────────── */
const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.46-.33-.23-.65-.48-.94-.75v7.02c.01 2.85-1.56 5.73-4.14 6.95-2.54 1.19-5.74 1.12-8.31-.21-2.58-1.31-4.22-4.16-4.05-7.06.06-2.85 1.51-5.73 4.09-7.03 1.94-1.01 4.31-1.12 6.36-.34.02 1.55-.01 3.1.02 4.65-1-.54-2.18-.58-3.23-.1-1.2.51-2.07 1.76-2.06 3.08.01 1.05.57 2.05 1.48 2.58.91.56 2.07.6 3.05.14 1.05-.51 1.72-1.59 1.73-2.75l.02-12.87z" />
  </svg>
);
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-3h2.5V9.5C10.5 7 12 5.8 14.2 5.8c1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.5.7-1.5 1.4V12H18l-.5 3h-2.6v7A10 10 0 0 0 22 12z" />
  </svg>
);
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm4.5-3.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
  </svg>
);

export default function Footer() {
  const t = useTranslations("Homepage.footer");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  // Only use Company, Support, Policies — Socials handled via icons
  const columns = (t.raw("columns") as any[]).filter(
    (col: any) => col.title !== "Socials",
  );

  return (
    <footer className="bg-footer-bg text-slate-700 border-t border-slate-200">
      {/* ── NEWSLETTER BANNER ──────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">
                Stay in the loop
              </p>
              <h3 className="text-xl font-bold text-slate-900">
                Get exclusive deals &amp; fresh updates
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Weekly drops. Zero spam. Unsubscribe anytime.
              </p>
            </div>

            <form
              onSubmit={handleSubscribe}
              className="relative w-full max-w-md"
            >
              {subscribed ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 text-emerald-700 font-semibold">
                  <CheckCircle size={20} className="text-emerald-500" />
                  You&apos;re subscribed — thank you!
                </div>
              ) : (
                <div className="flex items-center bg-white border border-slate-200 rounded-full overflow-hidden shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition-all">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-transparent px-5 py-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                  <button
                    type="submit"
                    className="m-1.5 h-9 px-5 bg-primary hover:brightness-110 active:scale-95 text-white rounded-full font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-primary/20"
                  >
                    <Send size={15} />
                    <span className="hidden sm:inline">Subscribe</span>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-2 px-1 text-[11px] text-slate-400">
                <ShieldCheck size={12} className="text-emerald-500" />
                Spam-free · Unsubscribe anytime
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* BRAND */}
          <div className="space-y-7">
            <Link href="/" className="inline-block">
              <Image
                src="/logos/onlinemandawee-logo.png"
                alt="Online Mandawee"
                width={220}
                height={68}
                className="h-22 w-auto transition-opacity hover:opacity-80"
              />
            </Link>

            <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
              {t("description")}
            </p>

            {/* Contact */}
            <div className="space-y-3">
              <a
                href="tel:+93799899856"
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all text-slate-500 group-hover:text-primary shadow-sm">
                  <Phone size={15} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Talk to Us
                  </p>
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">
                    (+93) 799 899856
                  </p>
                </div>
              </a>

              <a
                href="mailto:info@onlinemandawee.com"
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all text-slate-500 group-hover:text-primary shadow-sm">
                  <Mail size={15} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </p>
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">
                    info@onlinemandawee.com
                  </p>
                </div>
              </a>
            </div>

            {/* Socials */}
            <div className="flex gap-3 pt-1">
              {[
                {
                  href: "https://facebook.com/onlinemandawee",
                  icon: <FacebookIcon />,
                  label: "Facebook",
                },
                {
                  href: "https://instagram.com/onlinemandawee",
                  icon: <InstagramIcon />,
                  label: "Instagram",
                },
                {
                  href: "https://tiktok.com/@onlinemandawee",
                  icon: <TikTokIcon />,
                  label: "TikTok",
                },
              ].map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/40 hover:shadow-md transition-all cursor-pointer shadow-sm"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* NAV COLUMNS — Company / Support / Policies */}
          {columns.map((column: any) => (
            <div key={column.title}>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-5">
                {column.title}
              </h3>
              <ul className="space-y-3.5">
                {column.links.map((label: string) => {
                  const href = LINK_MAP[label] ?? "#";
                  return (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-slate-500 hover:text-primary transition-colors cursor-pointer"
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM BAR ─────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 order-2 sm:order-1">
            {t("copyright")}
          </p>

          <div className="flex items-center gap-6 order-1 sm:order-2">
            <div className="flex gap-5 text-xs text-slate-500">
              <Link
                href="/privacy"
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Terms
              </Link>
              <Link
                href="/sitemap"
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Sitemap
              </Link>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CreditCard size={14} />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

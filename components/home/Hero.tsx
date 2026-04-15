"use client";

/** @jsxImportSource react */
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, Sparkles, TrendingUp, Users } from "lucide-react";

interface Stat {
  value: string;
  label: string;
}

interface HeroProps {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    stats: Stat[];
    floatingTopEyebrow: string;
    floatingTopTitle: string;
    floatingBottomEyebrow: string;
    floatingBottomTitle: string;
  };
}

export default function Hero({ hero }: HeroProps) {
  return (
    <section
      className="relative overflow-hidden bg-white selection:bg-primary/10"
    >
      {/* ── BACKGROUND ART ── */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Animated Mesh Gradients */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            rotate: [0, 10, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full"
        />
        <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-linear-to-t from-white to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-2 pt-2 pb-8 sm:pt-2 lg:pb-8">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 lg:items-center">
          {/* 🚀 LEFT CONTENT: MESSAGING 🚀 */}
          <div className="relative z-10 space-y-6">
            {/* Tagline Badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:gap-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm shadow-slate-200/50"
            >
              <div className="flex -space-x-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white ring-1 ring-slate-100 overflow-hidden bg-slate-100"
                  >
                    <Image
                      src={`/images/avatars/user-${i}.png`}
                      alt="user"
                      width={16}
                      height={16}
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                {hero.eyebrow}
              </span>
            </motion.div>

            {/* Headline */}
            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 leading-[0.95] tracking-tight"
              >
                Send{" "}
                <span className="text-primary italic font-(family-name:--font-playfair)">
                  Love
                </span>{" "}
                <br />
                To Your Family.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="max-w-lg sm:max-w-xl text-sm sm:text-base lg:text-lg text-slate-500 font-medium leading-relaxed"
              >
                {hero.description}
              </motion.p>
            </div>

            {/* Action Group */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center"
            >
              {/* Primary Button */}
              <button className="h-12 sm:h-14 px-6 sm:px-8 rounded-full font-black uppercase tracking-widest text-xs sm:text-sm shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 sm:gap-3 group border border-primary/10 overflow-hidden relative text-white">
                {/* Base bg */}
                <div className="absolute inset-0 bg-primary/95" />
                {/* Sweep layer */}
                <div className="absolute inset-0 bg-primary translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 ease-in-out" />
                {/* Top gloss */}
                <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent pointer-events-none" />
                <span className="relative z-10 text-sm sm:text-base">
                  {hero.primaryCta}
                </span>
                <Sparkles
                  size={14}
                  className="relative z-10 group-hover:rotate-12 transition-transform"
                />
              </button>

              {/* Secondary Button */}
              <button className="h-12 sm:h-14 px-6 sm:px-8 rounded-full font-black uppercase tracking-widest text-xs sm:text-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 sm:gap-3 group overflow-hidden relative border-2 border-slate-100">
                {/* Sweep layer */}
                <div className="absolute inset-0 bg-primary/5 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500 ease-in-out" />
                {/* Border color shift on hover - handled via group */}
                <span className="relative z-10 text-slate-800 group-hover:text-primary transition-colors duration-300 text-sm sm:text-base">
                  {hero.secondaryCta}
                </span>
              </button>
            </motion.div>

            {/* Stats Micro-Row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-6 sm:gap-8 sm:gap-10 pt-4"
            >
              {hero.stats.map((stat, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    {stat.value}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* 🎨 RIGHT CONTENT: ORGANIC MOSAIC 🎨 */}
          <div className="relative h-100 sm:h-120 lg:h-175 w-full mt-6 lg:mt-0 overflow-visible sm:overflow-visible">
            {/* 🧊 MAIN FLOATING CANVAS 🧊 */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Image 1: The Connection (Main) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-64 sm:w-72 lg:w-[320px] aspect-5/6 rounded-2xl overflow-hidden border-2 border-primary shadow-[0_40px_100px_rgba(15,23,42,0.15)] z-20 mx-auto lg:mx-0"
              >
                <Image
                  src="/images/hero-1.png"
                  alt="Connection"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-linear-to-tr from-slate-900/40 via-transparent to-transparent opacity-60" />
              </motion.div>

              {/* Image 2: The Harvest (Overlap) */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotate: 12 }}
                animate={{ opacity: 1, x: 0, rotate: 12 }}
                transition={{ delay: 0.4, duration: 1.2 }}
                className="absolute right-2 sm:-right-1 -bottom-4 w-32 sm:w-40 lg:w-50 aspect-square rounded-2xl overflow-hidden border-2 border-primary shadow-2xl z-30"
              >
                <Image
                  src="/images/hero-2.png"
                  alt="Organic Market"
                  fill
                  className="object-cover"
                />
              </motion.div>

              {/* Floating "Trusted" Pill */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -left-2 sm:-left-6 top-[20%] z-40 p-2 sm:p-3 lg:p-4 bg-white/80 backdrop-blur-xl border border-white/50 rounded-xl sm:rounded-2xl shadow-xl flex items-center gap-2 sm:gap-3"
              >
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-white shrink-0">
                  <Users size={14} className="sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-primary">
                    Family Trusted
                  </p>
                  <p className="text-[10px] sm:text-sm font-black text-slate-900 tracking-tight truncate">
                    Worldwide delivery
                  </p>
                </div>
              </motion.div>

              {/* Floating "Market" Pill */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute right-0 sm:-right-4 lg:-right-8 top-[5%] sm:top-[10%] z-50 p-2 sm:p-3 lg:p-5 bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl text-white max-w-[140px] sm:max-w-none"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 mb-1 sm:mb-2">
                  <TrendingUp size={12} className="text-primary" />
                  <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Live Deals
                  </span>
                </div>
                <p className="text-[9px] sm:text-sm lg:text-base font-medium leading-tight">
                  Fresh harvest <br className="hidden sm:block" /> Just arrived!
                </p>
              </motion.div>

              {/* Decorative Blobs/Shapes */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[5%] -right-[5%] -z-10 opacity-20"
              >
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient
                      id="grad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        style={{ stopColor: "var(--primary, #DC3545)" }}
                      />
                      <stop
                        offset="100%"
                        style={{ stopColor: "var(--primary, #DC3545)" }}
                      />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#grad)"
                    d="M45.1,-62.1C58.8,-53.2,70.1,-40.4,75.2,-25.8C80.3,-11.2,79.2,-5.3,75.4,8.8C71.6,22.9,65,45.2,51.6,58.3C38.2,71.4,18.1,75.3,1.3,74C-15.5,72.7,-31,66.2,-44.6,54.9C-58.2,43.6,-69.9,27.5,-73.4,10.6C-76.9,-6.2,-72.3,-23.7,-62.4,-37C-52.5,-50.2,-37.4,-59.2,-23,-67.6C-8.6,-76.1,5.1,-84.1,20.3,-84.3C35.5,-84.5,52.2,-76.8,45.1,-62.1Z"
                    transform="translate(100 100)"
                  />
                </svg>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

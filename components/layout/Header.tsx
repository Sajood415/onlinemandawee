"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/store/auth-context";
import { useCart } from "@/store/cart-context";
import { useCurrency } from "@/store/currency-context";
import Link from "next/link";
import { 
  Search, User, ShoppingCart, ChevronDown, Check, Menu, 
  Store, LayoutDashboard, Globe, DollarSign, X, 
  Coffee, Cookie, Milk, Apple, Package, HelpCircle, Gift, Sparkles, Zap,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Framer Motion Configuration ---
const dropdownVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  visible: { 
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 } 
  },
  exit: { opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.15 } },
};

const sheetVariants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: { type: "spring", damping: 30, stiffness: 300 } },
  exit: { x: "100%", transition: { type: "spring", damping: 30, stiffness: 300 } }
};

export default function Header() {
  const t = useTranslations("Homepage.navbar");
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const { currency, setCurrency } = useCurrency();

  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const locale = useLocale();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogin = () => router.push("/auth/login");

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push("/");
  };

  const closeAll = useCallback(() => {
    setShowUserMenu(false);
    setShowCategoriesDropdown(false);
    setIsCartOpen(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setShowCategoriesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="sticky top-0 z-[100] w-full bg-white shadow-sm">
        {/* ================= TOP HEADER ================= */}
        <header className="border-b border-gray-100 bg-white/95 backdrop-blur-xl relative z-[100]">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-4 lg:gap-8">
              {/* LOGO */}
              <Link href="/" className="flex-shrink-0">
                <Image
                  src="/logos/onlinemandawee-logo.png"
                  alt="logo"
                  width={180}
                  height={52}
                  className="h-9 sm:h-14 w-auto drop-shadow-sm transition-transform hover:scale-105"
                  priority
                />
              </Link>

              {/* SEARCH - Desktop */}
              <form
                onSubmit={handleSearch}
                className="hidden lg:flex flex-1 items-center gap-3 bg-gray-50 hover:bg-gray-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 px-5 rounded-full h-12 border border-gray-200 transition-all duration-300 group max-w-2xl"
              >
                <Search className="text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent outline-none text-[15px] font-medium placeholder:text-gray-400"
                />
                <button type="submit" className="bg-primary hover:brightness-110 active:scale-95 text-white px-6 py-2 rounded-full font-bold text-sm shadow-md h-9 transition-all">
                  {t("searchButton")}
                </button>
              </form>

              {/* RIGHT ICONS - Integrated Professional Row */}
              <div className="flex items-center gap-1 sm:gap-4 ml-auto">
                {/* Mobile Search Toggle */}
                <button 
                  onClick={() => setShowMobileSearch(!showMobileSearch)}
                  className="lg:hidden p-2 text-gray-500 hover:text-primary transition-colors cursor-pointer"
                >
                  <Search size={22} />
                </button>

                {/* VENDOR PORTAL - Professional Row Alignment */}
                <Link 
                  href={isAuthenticated && user?.role === 'VENDOR' ? "/vendor/dashboard" : "/vendor/register"} 
                  className="hidden sm:flex items-center gap-3 group px-3 py-1.5 hover:bg-gray-50 rounded-full transition-all border border-transparent hover:border-gray-100"
                >
                  <div className="h-9 w-9 flex items-center justify-center rounded-full bg-gray-50 group-hover:bg-primary/5 transition-all outline outline-1 outline-gray-100">
                    {isAuthenticated && user?.role === 'VENDOR' ? (
                      <LayoutDashboard size={18} className="text-gray-600 group-hover:text-primary transition-colors" />
                    ) : (
                      <Store size={18} className="text-gray-600 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <div className="flex flex-col -space-y-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-primary transition-colors">Portal</span>
                    <span className="text-[13px] font-bold text-gray-700 group-hover:text-primary leading-tight transition-colors">
                      {isAuthenticated && user?.role === 'VENDOR' ? "Dashboard" : "Seller"}
                    </span>
                  </div>
                </Link>

                <div className="h-8 w-px bg-gray-100 hidden md:block mx-1" />

                {/* SELECTORS - Aligned properly */}
                <div className="hidden md:flex items-center gap-2">
                  <LanguageSelector
                    locale={locale}
                    languages={[
                      {code: 'en', label: 'English', flag: '🇺🇸'},
                      {code: 'ps', label: 'پښتو', flag: '🇦🇫'},
                      {code: 'fa-AF', label: 'دری', flag: '🇦🇫'}
                    ]}
                  />
                  <CurrencySelector />
                </div>

                {/* USER & CART ICONS - Horizontal Alignment */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-px bg-gray-100 hidden sm:block mx-1" />
                  
                  <div className="relative" ref={userMenuRef}>
                    <IconButton onClick={() => setShowUserMenu(!showUserMenu)} active={showUserMenu}>
                      <User size={20} />
                    </IconButton>
                    <AnimatePresence>
                      {showUserMenu && (
                        <motion.div 
                          variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
                          className="absolute right-0 mt-4 w-60 bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] z-[1001] border border-gray-100 overflow-hidden"
                        >
                          <div className="py-2 px-1">
                            {isAuthenticated ? (
                              <>
                                <div className="px-4 py-3 border-b border-gray-50 mb-2 bg-gray-50/50">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Authenticated Account</p>
                                  <p className="text-[13px] font-bold text-gray-800 truncate">{user?.email}</p>
                                </div>
                                <Link href={user?.role === 'CUSTOMER' ? "/profile" : user?.role === 'VENDOR' ? "/vendor/profile" : "/admin/profile"} onClick={closeAll} className="menu-link"><User size={16}/> Profile</Link>
                                <button onClick={() => { router.push(user?.role === 'CUSTOMER' ? "/orders" : "/vendor/orders"); closeAll(); }} className="menu-link"><ShoppingCart size={16}/> My Orders</button>
                                <div className="h-px bg-gray-100 my-2 mx-2" />
                                <button onClick={handleLogout} className="menu-link text-red-500 hover:bg-red-50">Sign Out</button>
                              </>
                            ) : (
                              <div className="p-3">
                                <button onClick={() => { router.push("/auth/login"); closeAll(); }} className="w-full py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer">
                                  Access Account
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <IconButton onClick={() => setIsCartOpen(true)} badge={itemCount?.toString()}>
                    <ShoppingCart size={20} />
                  </IconButton>
                </div>
              </div>
            </div>

            {/* Mobile Search Bar Expansion */}
            <AnimatePresence>
              {showMobileSearch && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden mt-3 overflow-hidden pb-1">
                  <form onSubmit={handleSearch} className="relative">
                    <input
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search items..."
                      className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white p-2 rounded-lg">
                      <Search size={18} />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <nav className="bg-primary text-white relative z-50">
          <div className="max-w-7xl mx-auto px-4 flex items-center h-14 sm:h-[68px]">
            {/* CATEGORIES BUTTON */}
            <div className="relative flex-shrink-0" ref={categoriesRef}>
              <button
                onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
                className={`flex items-center gap-3 font-bold h-14 sm:h-[68px] px-5 sm:px-10 transition-all duration-300 cursor-pointer border-r border-white/10 ${showCategoriesDropdown ? 'bg-white text-primary shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]' : 'bg-black/10 hover:bg-black/20'}`}
              >
                <Menu size={20} />
                <span className="hidden leading-none sm:inline mt-0.5 tracking-tight">Explore Categories</span>
                <ChevronDown size={14} className={`transition-transform duration-300 opacity-60 ${showCategoriesDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showCategoriesDropdown && (
                  <motion.div 
                    variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
                    className="absolute top-full left-0 w-[280px] sm:w-[350px] bg-white text-gray-800 rounded-b-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] z-[1001] border-x border-b border-gray-100 overflow-hidden"
                  >
                    <div className="p-4 grid gap-1.5">
                      <p className="px-4 py-2 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Store Departments</p>
                      <CategoryItem href="/categories/breakfast" icon={<Coffee size={18}/>} label="Breakfast & Bakery" onClick={closeAll} />
                      <CategoryItem href="/categories/snacks" icon={<Cookie size={18}/>} label="Snacks & Sweets" onClick={closeAll} />
                      <CategoryItem href="/categories/beverages" icon={<Milk size={18}/>} label="Drinks & Juice" onClick={closeAll} />
                      <CategoryItem href="/categories/fresh-produce" icon={<Apple size={18}/>} label="Fruits & Vegetables" onClick={closeAll} />
                      <CategoryItem href="/categories/pantry" icon={<Package size={18}/>} label="Pantry Essentials" onClick={closeAll} />
                      <div className="h-px bg-gray-100 my-2 mx-4" />
                      <Link href="/products" onClick={closeAll} className="mx-2 px-5 py-4 text-sm font-black text-primary hover:bg-primary/5 rounded-2xl flex items-center justify-between group transition-all">
                        Discover Everything <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* NAV LINKS - High Performance Horizontal Layout */}
            <div className="flex-1 flex items-center gap-8 sm:gap-10 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-8 py-2 text-[14px] sm:text-[15px] font-bold">
              <Link href="/" className="nav-link-bottom">Home</Link>
              <Link href="/products" className="nav-link-bottom">Products</Link>
              <Link href="/gifts" className="nav-link-bottom relative flex items-center gap-2 group">
                Gift Sets
                <span className="bg-yellow-400 text-yellow-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm group-hover:scale-110 transition-transform">New</span>
              </Link>
              <Link href="/baby-packages" className="nav-link-bottom">Baby Care</Link>
              <Link href="/deals" className="nav-link-bottom flex items-center gap-1.5">
                <Zap size={15} className="text-yellow-400 fill-yellow-400" /> Daily Deals
              </Link>
              <Link href="/contact" className="nav-link-bottom">Support</Link>
            </div>
          </div>
        </nav>
      </div>

      {/* ================= CART SHEET (MODERN SIDEBAR) ================= */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[1000] overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px] cursor-pointer"
            />
            {/* Sheet Side Panel */}
            <motion.div 
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute top-0 right-0 h-full w-full max-w-[420px] bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.3)] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/5 p-2 rounded-xl">
                    <ShoppingCart size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none">Your Cart</h2>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Review Items</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all cursor-pointer group"
                >
                  <X size={24} className="text-gray-400 group-hover:text-gray-900 transition-colors" />
                </button>
              </div>

              {/* Cart Content Area */}
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
                 <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-6 ring-4 ring-gray-25">
                    <ShoppingCart size={56} className="text-gray-200" />
                 </div>
                 <h3 className="text-xl font-black text-gray-900 mb-2">{itemCount > 0 ? `Basket contains ${itemCount} items` : "Your basket is empty"}</h3>
                 <p className="text-gray-500 max-w-[280px] text-sm leading-relaxed mb-8">
                   Treat your family to something special! Browse our marketplace for the freshest items in Kabul.
                 </p>
                 <Link href="/products" onClick={() => setIsCartOpen(false)} className="px-12 py-4 bg-primary text-white rounded-2xl font-black shadow-[0_15px_30px_-5px_rgba(241,89,42,0.3)] hover:brightness-110 active:scale-95 transition-all">
                    Browse Marketplace
                 </Link>
              </div>

              {/* Sticky Footer */}
              {itemCount > 0 && (
                <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-4">
                     <span className="font-bold text-gray-400 uppercase text-xs tracking-widest">Estimated Total</span>
                     <span className="text-2xl font-black text-gray-900">--.--</span>
                  </div>
                  <Link href="/cart" onClick={() => setIsCartOpen(false)} className="w-full py-4.5 bg-gray-900 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 hover:bg-black transition-all group">
                    View Shopping Cart <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .menu-link {
          display: flex;
          align-items: center;
          gap: 12px;
          width: calc(100% - 12px);
          margin: 6px;
          padding: 14px 18px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          color: #4b5563;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .menu-link:hover {
          background: #fdf2f0;
          color: #f1592a;
          transform: translateX(6px);
        }
        .nav-link-bottom {
          color: rgba(255, 255, 255, 0.9);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          display: flex;
          align-items: center;
          height: 100%;
        }
        .nav-link-bottom:hover {
          color: white;
          transform: translateY(-2px);
        }
        .nav-link-bottom::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 3px;
          background: #fbbf24;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .nav-link-bottom:hover::after {
          width: 100%;
        }
      `}</style>
    </>
  );
}

/* ================= COMPONENT HELPERS ================= */

function CategoryItem({ href, icon, label, onClick }: any) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-4 px-4 py-4 rounded-[1.25rem] hover:bg-primary/5 group transition-all duration-300">
      <div className="w-11 h-11 flex items-center justify-center bg-gray-50 rounded-2xl group-hover:bg-white shadow-sm border border-gray-100 group-hover:border-primary/30 transition-all text-gray-400 group-hover:text-primary group-hover:scale-110 group-hover:rotate-3 shadow-inner">
        {icon}
      </div>
      <span className="font-bold text-gray-700 group-hover:text-gray-950 transition-colors text-[15px] tracking-tight">{label}</span>
      <ArrowRight size={16} className="ml-auto opacity-0 group-hover:opacity-100 transition-all text-primary translate-x-[-10px] group-hover:translate-x-0" />
    </Link>
  );
}

function CurrencySelector() {
  const [open, setOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const currencies: ("USD" | "AFN" | "EUR" | "CAD")[] = ["USD", "AFN", "EUR", "CAD"];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function click(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    window.addEventListener("mousedown", click); return () => window.removeEventListener("mousedown", click);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)} 
        className={`h-11 px-4 rounded-full border flex items-center gap-2 text-[14px] font-bold transition-all cursor-pointer ${open ? 'bg-white shadow-lg border-primary/30 text-primary' : 'bg-gray-50/80 border-gray-100 hover:bg-white text-gray-600'}`}
      >
        <DollarSign size={14} className={`${open ? 'text-primary' : 'text-gray-400'}`} />
        <span className="mt-0.5">{currency}</span>
        <ChevronDown size={12} className={`transition-transform duration-300 ${open ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute right-0 mt-3 w-40 bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100 z-[1001] overflow-hidden p-2">
            <p className="px-4 py-2.5 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Currency Select</p>
            {currencies.map(c => (
              <button 
                key={c} 
                onClick={() => {setCurrency(c); setOpen(false)}} 
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all cursor-pointer ${currency===c ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {c}
                {currency === c && <div className="h-2 w-2 rounded-full bg-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LanguageSelector({ locale, languages }: any) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((l:any) => l.code === locale) || languages[0];

  useEffect(() => {
    function click(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    window.addEventListener("mousedown", click); return () => window.removeEventListener("mousedown", click);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)} 
        className={`h-11 px-3.5 rounded-full border flex items-center gap-2 text-sm font-bold transition-all cursor-pointer ${open ? 'bg-white shadow-lg border-primary/30 text-primary' : 'bg-gray-50/80 border-gray-100 hover:bg-white text-gray-600'}`}
      >
        <span className="text-lg w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-md border border-gray-100">{current.flag}</span>
        <span className="uppercase text-xs tracking-widest mt-0.5">{locale.split('-')[0]}</span>
        <ChevronDown size={12} className={`transition-transform duration-300 ${open ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-gray-100 z-[1001] overflow-hidden p-2">
            <p className="px-5 py-3 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Language Select</p>
            {languages.map((l:any) => (
              <button 
                key={l.code} 
                onClick={() => {setOpen(false); router.replace(pathname, {locale: l.code})}} 
                className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-bold flex items-center gap-4 transition-all cursor-pointer ${locale===l.code ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="text-xl">{l.flag}</span> {l.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconButton({ children, badge, onClick, active }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`relative h-11 w-11 flex items-center justify-center rounded-full border transition-all duration-300 group active:scale-90 cursor-pointer ${active ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30' : 'border-gray-100 bg-white hover:bg-gray-50 text-gray-600 hover:text-primary hover:border-primary/30'}`}
    >
      {children}
      {badge && (
        <span className={`absolute -top-1 -right-1 text-[10px] font-black min-w-[20px] h-[20px] flex items-center justify-center rounded-full ring-2 shadow-md transition-all ${active ? 'bg-white text-primary ring-primary' : 'bg-primary text-white ring-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  Clock,
  Star,
  Play,
  Pause,
  Sparkles,
} from "lucide-react";

// Full-background hero slides - Local carousel images
const heroSlides = [
  {
    id: 1,
    image: "/images/carousals/slide-1.jpg",
    alt: "Fresh organic groceries",
    eyebrow: "Farm Fresh Daily",
    title: "Organic Veggies & Fruits Delivered",
    description:
      "From local farms to your doorstep. Get 20% off your first fresh produce order!",
    cta: "Shop Fresh",
    ctaLink: "/products?category=groceries",
    themeColor: "#F59E0B",
    overlayColor: "rgba(0,0,0,0.35)",
    textPosition: "left",
  },
  {
    id: 2,
    image: "/images/carousals/slide-2.jpg",
    alt: "Premium baby essentials",
    eyebrow: "The Baby Event",
    title: "Gentle Care for Your Little One",
    description:
      "Premium baby products with love. Soft, safe, and perfect for delicate skin.",
    cta: "Shop Baby",
    ctaLink: "/baby-packages",
    themeColor: "#EC4899",
    overlayColor: "rgba(0,0,0,0.3)",
    textPosition: "left",
  },
  {
    id: 3,
    image: "/images/carousals/slide-3.jpg",
    alt: "Baby bath essentials",
    eyebrow: "Bath Time Fun",
    title: "Make Bath Time a Joy",
    description:
      "Natural bath essentials that make cleaning up fun and safe for babies.",
    cta: "Explore",
    ctaLink: "/products?category=baby-care",
    themeColor: "#06B6D4",
    overlayColor: "rgba(0,0,0,0.35)",
    textPosition: "left",
  },
  {
    id: 4,
    image: "/images/carousals/slide-4.jpg",
    alt: "Gifts and celebrations",
    eyebrow: "Celebrate Together",
    title: "Gifts That Spark Joy",
    description:
      "Curated gift packages for every occasion. Birthdays, parties & special moments.",
    cta: "Shop Gifts",
    ctaLink: "/gifts",
    themeColor: "#8B5CF6",
    overlayColor: "rgba(0,0,0,0.4)",
    textPosition: "left",
  },
  {
    id: 5,
    image: "/images/carousals/slide-5.jpg",
    alt: "Fresh fruit market",
    eyebrow: "Summer Harvest",
    title: "Taste the Season's Best",
    description:
      "Handpicked seasonal fruits. Juicy, ripe, and delivered fresh within hours.",
    cta: "Order Now",
    ctaLink: "/products?category=fruits",
    themeColor: "#EF4444",
    overlayColor: "rgba(0,0,0,0.35)",
    textPosition: "left",
  },
  {
    id: 6,
    image: "/images/carousals/slide-6.jpg",
    alt: "Special offers",
    eyebrow: "Limited Time",
    title: "Weekend Special Deals",
    description:
      "Exclusive discounts on your favorite products. Valid this weekend only!",
    cta: "View Deals",
    ctaLink: "/deals",
    themeColor: "#10B981",
    overlayColor: "rgba(0,0,0,0.4)",
    textPosition: "left",
  },
];

// Trust badges
const trustBadges = [
  { icon: Truck, text: "Same-day delivery", subtext: "Order by 2PM" },
  { icon: Star, text: "800+ vendors", subtext: "Verified sellers" },
  { icon: Clock, text: "Express options", subtext: "2-hour delivery" },
  { icon: Sparkles, text: "Gift wrapping", subtext: "Free on $50+" },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-rotate slides
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentSlide(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
    );
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentSlide(index);
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const currentSlideData = heroSlides[currentSlide];

  return (
    <section className="w-full bg-white">
      {/* Hero Carousel - Walmart Style */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Main Hero Container - Walmart Baby Event Style */}
          <div className="relative rounded-2xl overflow-hidden shadow-lg">
            {/* Top Navigation Controls - Walmart Style */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="w-8 h-8 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 border border-gray-100"
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} className="text-primary" />
              </button>
              <button
                onClick={toggleAutoPlay}
                className="w-8 h-8 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 border border-gray-100"
                aria-label={
                  isAutoPlaying ? "Pause slideshow" : "Play slideshow"
                }
              >
                {isAutoPlaying ? (
                  <Pause size={18} className="text-primary" />
                ) : (
                  <Play size={18} className="text-primary ml-0.5" />
                )}
              </button>
              <button
                onClick={nextSlide}
                className="w-8 h-8 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 border border-gray-100"
                aria-label="Next slide"
              >
                <ChevronRight size={20} className="text-primary" />
              </button>
            </div>

            {/* Slides - Full Background Image Banner */}
            <div className="relative min-h-80 sm:min-h-90 md:min-h-100 lg:min-h-110 rounded-2xl overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative h-full min-h-80 sm:min-h-90 md:min-h-100 lg:min-h-110"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <Image
                      src={currentSlideData.image}
                      alt={currentSlideData.alt}
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Overlay for text readability */}
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: currentSlideData.overlayColor }}
                    />
                  </div>

                  {/* Content - Positioned based on textPosition */}
                  <div
                    className={`relative z-10 h-full flex items-center px-6 md:px-12 lg:px-16 py-10 ${
                      currentSlideData.textPosition === "center"
                        ? "justify-center text-center"
                        : currentSlideData.textPosition === "right"
                          ? "justify-end text-right"
                          : "justify-start text-left"
                    }`}
                  >
                    <div className="max-w-md">
                      {/* Eyebrow Tag */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="inline-block mb-3"
                      >
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-gray-900 shadow-md">
                          {currentSlideData.eyebrow}
                        </span>
                      </motion.div>

                      {/* Title */}
                      <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-3 text-white drop-shadow-lg"
                      >
                        {currentSlideData.title}
                      </motion.h1>

                      {/* Description */}
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="text-sm md:text-base mb-5 text-white/90 drop-shadow-md"
                      >
                        {currentSlideData.description}
                      </motion.p>

                      {/* CTA Button */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.4 }}
                      >
                        <Link
                          href={currentSlideData.ctaLink}
                          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          {currentSlideData.cta}
                        </Link>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots Indicator - Bottom Center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "bg-white w-8"
                      : "bg-white/60 hover:bg-white/80 w-2.5 hover:scale-125"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Trust Badges Bar - Walmart Style */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustBadges.map((badge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-[#e6f1fc] rounded-full flex items-center justify-center shrink-0">
                  <badge.icon size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-[#171717] text-sm">
                    {badge.text}
                  </p>
                  <p className="text-[#74767c] text-xs">{badge.subtext}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Currency = "USD" | "AFN" | "EUR" | "CAD";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (price: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>("USD");

  useEffect(() => {
    const savedCurrency = localStorage.getItem("selectedCurrency") as Currency;
    if (savedCurrency) {
      setCurrencyState(savedCurrency);
    }
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("selectedCurrency", newCurrency);
  };

  const formatPrice = (price: number) => {
    // Basic conversion rates for demonstration (In a real app, fetch these from an API)
    const rates: Record<Currency, number> = {
      USD: 1,
      AFN: 71.5,
      EUR: 0.94,
      CAD: 1.38,
    };

    const symbols: Record<Currency, string> = {
      USD: "$",
      AFN: "؋",
      EUR: "€",
      CAD: "C$",
    };

    const converted = price * rates[currency];
    
    if (currency === "AFN") {
        return `${converted.toLocaleString()} ${symbols[currency]}`;
    }
    return `${symbols[currency]}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};

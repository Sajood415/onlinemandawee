"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  ReactNode,
} from "react";
import { invalidateVendorStoreNameCache } from "@/lib/vendor/store-name-cache";
import { parseApiResponse } from "@/lib/http/parse-api-response";

type User = {
  id: string;
  sessionId: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  email: string;
  phone: string;
  fullName: string;
  status: "ACTIVE" | "PENDING" | "BLOCKED";
  preferredCurrency?: string | null;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  establishSession: (session: AuthResult) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
};

type AuthResult = {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: "Bearer";
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const logout = () => {
    invalidateVendorStoreNameCache();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  // useLayoutEffect: resolve no-token path synchronously before paint to avoid
  // flashing the login control for guests; keep "loading" until /me returns when a token exists.
  useLayoutEffect(() => {
    void checkAuth();
  }, []);

  useLayoutEffect(() => {
    const handleSessionExpired = () => logout();

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("accessToken")?.trim();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await parseApiResponse<User>(response);
        setUser(userData);
      } else {
        invalidateVendorStoreNameCache();
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const establishSession = (session: AuthResult) => {
    invalidateVendorStoreNameCache();
    localStorage.setItem("accessToken", session.tokens.accessToken);
    localStorage.setItem("refreshToken", session.tokens.refreshToken);
    setUser(session.user);
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await parseApiResponse<AuthResult>(response);
      establishSession(data);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem("refreshToken");
      if (!refresh) throw new Error("No refresh token");

      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      const data = await parseApiResponse<AuthResult>(response);
      localStorage.setItem("accessToken", data.tokens.accessToken);
    } catch (error) {
      logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        establishSession,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

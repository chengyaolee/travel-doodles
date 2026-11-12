"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, AuthUser } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (custom_id: string, password?: string) => Promise<void>;
  register: (params: {
    custom_id: string;
    display_name?: string;
    bio?: string;
    password?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  authModalOpen: boolean;
  authModalAction: string;
  openAuthModal: (action?: string, onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  /**
   * Helper to gate actions. Returns true if user is logged in.
   * If not logged in, opens the Auth Modal explaining the action and saves the callback to run after login.
   */
  requireAuth: (actionName?: string, callback?: () => void) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalAction, setAuthModalAction] = useState("");
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Check existing session on mount
  useEffect(() => {
    let isMounted = true;
    api.getMe()
      .then((me) => {
        if (isMounted) setUser(me);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Automatically open auth modal if redirected back with auth_error
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth_error") || params.get("error")) {
        setAuthModalOpen(true);
      }
    }
  }, []);

  const openAuthModal = useCallback((action = "continue", onSuccess?: () => void) => {
    setAuthModalAction(action);
    if (onSuccess) setPendingCallback(() => onSuccess);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalAction("");
    setPendingCallback(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("auth_error") || url.searchParams.has("error")) {
        url.searchParams.delete("auth_error");
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  }, []);

  const executePending = useCallback(() => {
    if (pendingCallback) {
      const cb = pendingCallback;
      setPendingCallback(null);
      setTimeout(() => cb(), 100);
    }
  }, [pendingCallback]);

  const login = async (custom_id: string, password?: string) => {
    const loggedUser = await api.login({ custom_id, password });
    setUser(loggedUser);
    closeAuthModal();
    executePending();
  };

  const register = async (params: {
    custom_id: string;
    display_name?: string;
    bio?: string;
    password?: string;
  }) => {
    const newUser = await api.register(params);
    setUser(newUser);
    closeAuthModal();
    executePending();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const requireAuth = useCallback(
    (actionName = "continue", callback?: () => void): boolean => {
      if (user) {
        if (callback) callback();
        return true;
      }
      openAuthModal(actionName, callback);
      return false;
    },
    [user, openAuthModal]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        authModalOpen,
        authModalAction,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

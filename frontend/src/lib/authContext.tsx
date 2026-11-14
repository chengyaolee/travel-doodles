"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, AuthUser } from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authStage: "idle" | "authenticating" | "authenticated";
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
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStage, setAuthStage] = useState<"idle" | "authenticating" | "authenticated">("idle");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalAction, setAuthModalAction] = useState("");
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const isAuthenticating = authStage === "authenticating";

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

  const executePending = useCallback(() => {
    if (pendingCallback) {
      const cb = pendingCallback;
      setPendingCallback(null);
      setTimeout(() => cb(), 100);
    }
  }, [pendingCallback]);

  // Handle OAuth redirects and errors from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth_status");
    const authErr = params.get("auth_error") || params.get("error");

    if (authErr) {
      setAuthModalOpen(true);
      return;
    }

    if (authStatus === "authenticating") {
      setAuthModalOpen(true);
      setAuthStage("authenticating");

      let attempts = 0;
      const maxAttempts = 15;
      let cancelled = false;

      const pollSession = async () => {
        while (attempts < maxAttempts && !cancelled) {
          attempts++;
          try {
            const me = await api.getMe();
            if (me) {
              setUser(me);
              const url = new URL(window.location.href);
              url.searchParams.delete("auth_status");
              window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));

              // Switch progress bar to 100% full
              setAuthStage("authenticated");

              // Wait 0.5s for visual confirmation
              await new Promise((r) => setTimeout(r, 500));

              if (!cancelled) {
                setAuthStage("idle");
                setAuthModalOpen(false);
                setAuthModalAction("");
                executePending();
                try {
                  router.refresh();
                } catch {
                  // ignore
                }
              }
              return;
            }
          } catch {
            // retry
          }
          await new Promise((r) => setTimeout(r, 400));
        }

        if (!cancelled) {
          setAuthStage("idle");
          setAuthModalOpen(false);
        }
      };

      pollSession();

      return () => {
        cancelled = true;
      };
    }
  }, [executePending, router]);

  const openAuthModal = useCallback((action = "continue", onSuccess?: () => void) => {
    setAuthModalAction(action);
    if (onSuccess) setPendingCallback(() => onSuccess);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthStage("idle");
    setAuthModalAction("");
    setPendingCallback(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("auth_error") || url.searchParams.has("error") || url.searchParams.has("auth_status")) {
        url.searchParams.delete("auth_error");
        url.searchParams.delete("error");
        url.searchParams.delete("auth_status");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  }, []);

  const login = async (custom_id: string, password?: string) => {
    setAuthStage("authenticating");
    setAuthModalOpen(true);
    try {
      const loggedUser = await api.login({ custom_id, password });
      const verifiedUser = (await api.getMe()) || loggedUser;
      setUser(verifiedUser);
      setAuthStage("authenticated");
      await new Promise((r) => setTimeout(r, 500));
      closeAuthModal();
      executePending();
      try {
        router.refresh();
      } catch {
        // ignore
      }
    } finally {
      setAuthStage("idle");
    }
  };

  const register = async (params: {
    custom_id: string;
    display_name?: string;
    bio?: string;
    password?: string;
  }) => {
    setAuthStage("authenticating");
    setAuthModalOpen(true);
    try {
      const newUser = await api.register(params);
      const verifiedUser = (await api.getMe()) || newUser;
      setUser(verifiedUser);
      setAuthStage("authenticated");
      await new Promise((r) => setTimeout(r, 500));
      closeAuthModal();
      executePending();
      try {
        router.refresh();
      } catch {
        // ignore
      }
    } finally {
      setAuthStage("idle");
    }
  };

  const logout = async () => {
    // Optimistic UI state reset: immediately reflect logged out without waiting for network
    setUser(null);
    setAuthStage("idle");
    closeAuthModal();
    try {
      await api.logout();
    } catch {
      // ignore
    }
    try {
      router.refresh();
    } catch {
      // ignore
    }
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
        isAuthenticating,
        authStage,
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

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWalletClient, custom, getAddress } from "viem";
import { configuredChain } from "../lib/chain";
import { SiweMessage } from "siwe";

declare global { interface Window { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } } }

type Auth = {
  address?: string;
  status: "loading" | "disconnected" | "signing" | "connected" | "failed";
  error?: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string>();
  const [status, setStatus] = useState<Auth["status"]>("loading");
  const [error, setError] = useState<string>();
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await response.json();
      setAddress(data.session?.address);
      setStatus(data.session ? "connected" : "disconnected");
    } catch { setStatus("disconnected"); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const connect = useCallback(async () => {
    setError(undefined);
    if (!window.ethereum) { setError("Install an EVM wallet that supports Robinhood Chain."); setStatus("failed"); return; }
    setStatus("signing");
    try {
      const chain = configuredChain();
      const wallet = createWalletClient({ chain, transport: custom(window.ethereum) });
      const [account] = await wallet.requestAddresses();
      const nonceResponse = await fetch("/api/auth/nonce", { method: "POST" });
      if (!nonceResponse.ok) throw new Error("Could not create a secure sign-in request.");
      const { nonce } = await nonceResponse.json();
      const domain = window.location.host;
      const message = new SiweMessage({
        domain, address: getAddress(account), statement: "Sign in to record experiments in Fruit Fly World.",
        uri: window.location.origin, version: "1", chainId: chain.id, nonce
      }).prepareMessage();
      const signature = await wallet.signMessage({ account, message });
      const response = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, signature }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Signature verification failed.");
      setAddress(data.address); setStatus("connected");
      window.dispatchEvent(new Event("ffw:auth"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in was not completed."); setStatus("failed");
    }
  }, []);
  const disconnect = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    setAddress(undefined); setStatus("disconnected"); window.dispatchEvent(new Event("ffw:auth"));
  }, []);
  const value = useMemo(() => ({ address, status, error, connect, disconnect }), [address, status, error, connect, disconnect]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

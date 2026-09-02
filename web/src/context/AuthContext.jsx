import { createContext, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" until we've asked the server who the stored token belongs to.
  // Without this, a refresh would flash the signed-out UI for a moment.
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!tokenStore.get()) {
      setStatus("anonymous");
      return;
    }
    // Never trust a cached user object. Ask the API to turn the token back
    // into a user, which also detects tokens that expired while we were away.
    api("/api/auth/me")
      .then((u) => {
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        tokenStore.clear();
        setStatus("anonymous");
      });
  }, []);

  async function authenticate(path, body) {
    const { token, user: u } = await api(path, { method: "POST", body, auth: false });
    tokenStore.set(token);
    setUser(u);
    setStatus("authenticated");
    return u;
  }

  const value = {
    user,
    status,
    signup: (body) => authenticate("/api/auth/signup", body),
    login: (identifier, password) =>
      authenticate("/api/auth/login", { identifier, password }),
    logout: () => {
      tokenStore.clear();
      setUser(null);
      setStatus("anonymous");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

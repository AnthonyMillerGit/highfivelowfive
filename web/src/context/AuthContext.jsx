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
      .catch((err) => {
        // Only a 401 means the token is actually bad. A network blip or a
        // restarted API must not throw the session away — otherwise every
        // hiccup silently signs the user out and loses their place.
        if (err.status === 401) tokenStore.clear();
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
    // Handed the server's updated user after something changes it — a new
    // profile picture, today. The server's copy replaces ours wholesale
    // rather than being patched field by field here.
    updateUser: setUser,
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

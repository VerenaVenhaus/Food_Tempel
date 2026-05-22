// Globaler Auth-State.
//
// Beim App-Start:
//   - Wir prüfen, ob Supabase eine Session in AsyncStorage hat
//   - Falls ja: User ist eingeloggt
//   - Falls nein: User muss sich einloggen
// Während die Prüfung läuft, ist `loading=true` und die App zeigt einen Splash.
//
// Wir registrieren auch einen onAuthStateChange-Listener bei Supabase.
// Dann wird `user` automatisch aktualisiert, wenn jemand sich ein-/ausloggt.

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { isSupabaseConfigured, supabase } from "../lib/supabase";

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  configured: boolean; // false, wenn .env nicht gesetzt ist
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  user: null,
  session: null,
  configured: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Wenn Supabase noch nicht konfiguriert ist, blockieren wir nicht —
    // die App zeigt dann den Setup-Hinweis-Screen.
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Sicherheitsnetz: falls getSession() aus irgendeinem Grund hängt
    // (Netzwerk-Problem, AsyncStorage langsam, …), spätestens nach 5 Sek
    // einfach durchstarten — User sieht dann den Login-Screen.
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // 1. Beim App-Start: aktuelle Session aus AsyncStorage holen
    supabase.auth.getSession().then(({ data }) => {
      clearTimeout(timeoutId);
      setSession(data.session);
      setLoading(false);
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.warn("[Auth] getSession failed:", err);
      setLoading(false);
    });

    // 2. Auf Auth-Änderungen reagieren (Login, Logout, Token-Refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => {
      clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        user: session?.user ?? null,
        session,
        configured: isSupabaseConfigured,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

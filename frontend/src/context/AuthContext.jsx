import { createContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 Sync user with backend
    const syncUser = async (tokenFromEvent) => {
      try {
        let token = tokenFromEvent;

        // If token not passed, get it manually
        if (!token) {
          const { data } = await supabase.auth.getSession();
          token = data?.session?.access_token;
        }

        if (!token) return;

        await axios.post(
          "http://localhost:5000/user/sync",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

      } catch (err) {
        console.error("Sync failed:", err.message);
      }
    };

    // 🔹 Get current user on load
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.log("Error fetching user:", error.message);
      }

      setUser(data?.user || null);
      setLoading(false);

      // 🔥 Sync on refresh if user exists
      if (data?.user) {
        syncUser();
      }
    };

    getUser();

    // 🔹 Listen to login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);

        // 🔥 Sync on login
        if (session?.access_token) {
          syncUser(session.access_token);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
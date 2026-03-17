import { createContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user on app load
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.log("Error fetching user:", error.message);
      }

      setUser(data?.user || null);
      setLoading(false);
    };

    getUser();

    // Listen to auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
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
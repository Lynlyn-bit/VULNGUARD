import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiClient } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  // Subscription fields
  stripeCustomerId?: string;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  planTier: 'free' | 'pro' | 'enterprise';
  currentPeriodEnd?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (apiClient.isAuthenticated()) {
          const response = await apiClient.getCurrentUser();
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const data = await apiClient.signup(email, password, firstName, lastName);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Signup failed:', error);
      throw error.response?.data?.error || 'Signup failed';
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiClient.signin(email, password);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error.response?.data?.error || 'Login failed';
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

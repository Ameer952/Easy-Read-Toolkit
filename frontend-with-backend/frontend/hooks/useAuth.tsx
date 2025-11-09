import React, {
   createContext,
   useContext,
   useState,
   useEffect,
   ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

// ----------------------
// TYPES
// ----------------------
interface User {
   id: string;
   name: string;
   email: string;
   createdAt: string;
}

interface AuthContextType {
   user: User | null;
   token: string | null; // ✅ expose token for authenticated requests
   isLoading: boolean;
   login: (email: string, password: string) => Promise<boolean>;
   register: (
      name: string,
      email: string,
      password: string
   ) => Promise<boolean>;
   logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ----------------------
// API URL HANDLING
// ----------------------
function getDevHost() {
   // Try to detect Metro bundler host
   const uri =
      (Constants.expoConfig?.hostUri ||
         Constants.manifest?.debuggerHost ||
         "") + "";
   const host = uri.split(":")[0];

   if (host) return host;

   // Fallbacks
   if (Platform.OS === "android") return "10.0.2.2";
   if (Platform.OS === "ios") return "127.0.0.1";
   return "localhost";
}

// OPTIONAL: override for physical device
const LAN_IP = process.env.EXPO_PUBLIC_LAN_IP;

const DEV_HOST = LAN_IP || getDevHost();

// ✅ Final computed base URL
export const API_URL = __DEV__
   ? `http://${DEV_HOST}:5000/api/auth`
   : "https://your-production-url.com/api/auth";

// ----------------------
// STORAGE KEYS
// ----------------------
const TOKEN_STORAGE_KEY = "easyread.token";
const USER_STORAGE_KEY = "easyread.user";

// ----------------------
// PROVIDER
// ----------------------
export function AuthProvider({ children }: { children: ReactNode }) {
   const [user, setUser] = useState<User | null>(null);
   const [token, setToken] = useState<string | null>(null); // ✅ keep token in state
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      loadUser();
   }, []);

   const loadUser = async () => {
      try {
         // clean old local-user storage (from your original implementation)
         await AsyncStorage.removeItem("easyread.users");

         const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
         const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);

         if (storedToken) setToken(storedToken);
         if (storedToken && userData) {
            setUser(JSON.parse(userData));
         }
      } catch (err) {
         console.error("Failed to load user:", err);
      } finally {
         setIsLoading(false);
      }
   };

   // ----------------------
   // REGISTER
   // ----------------------
   const register = async (
      name: string,
      email: string,
      password: string
   ): Promise<boolean> => {
      try {
         console.log("Attempting registration...", { name, email });
         console.log("API URL:", `${API_URL}/register`);

         const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
         });

         console.log("Status:", response.status);
         const data = await response.json();
         console.log("Response:", data);

         if (data.success && data.user && data.token) {
            await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
            await AsyncStorage.setItem(
               USER_STORAGE_KEY,
               JSON.stringify(data.user)
            );
            setToken(data.token); // ✅ keep in memory
            setUser(data.user);
            return true;
         }

         console.log("Registration failed:", data.message);
         return false;
      } catch (err) {
         console.error("Registration network error:", err);
         return false;
      }
   };

   // ----------------------
   // LOGIN
   // ----------------------
   const login = async (email: string, password: string): Promise<boolean> => {
      try {
         console.log("Attempting login...", { email });
         console.log("API URL:", `${API_URL}/login`);

         const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
         });

         console.log("Status:", response.status);
         const data = await response.json();
         console.log("Response:", data);

         if (data.success && data.user && data.token) {
            await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
            await AsyncStorage.setItem(
               USER_STORAGE_KEY,
               JSON.stringify(data.user)
            );
            setToken(data.token); // ✅ keep in memory
            setUser(data.user);
            return true;
         }

         console.log("Login failed:", data.message);
         return false;
      } catch (err) {
         console.error("Login network error:", err);
         return false;
      }
   };

   // ----------------------
   // LOGOUT
   // ----------------------
   const logout = async () => {
      try {
         console.log("Logout triggered");

         const storedToken =
            token || (await AsyncStorage.getItem(TOKEN_STORAGE_KEY));

         if (storedToken) {
            const response = await fetch(`${API_URL}/logout`, {
               method: "POST",
               headers: {
                  Authorization: `Bearer ${storedToken}`,
                  "Content-Type": "application/json",
               },
            });

            console.log("Logout response:", response.status);
         }

         await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
         await AsyncStorage.removeItem(USER_STORAGE_KEY);
         setToken(null); // ✅ clear
         setUser(null);

         console.log("Token + user cleared locally");
      } catch (err) {
         console.error("Logout failed:", err);
      }
   };

   return (
      <AuthContext.Provider
         value={{ user, token, isLoading, login, register, logout }}
      >
         {children}
      </AuthContext.Provider>
   );
}

// ----------------------
// HOOK
// ----------------------
export function useAuth() {
   const ctx = useContext(AuthContext);
   if (ctx === undefined) {
      throw new Error("useAuth must be used within an AuthProvider");
   }
   return ctx;
}

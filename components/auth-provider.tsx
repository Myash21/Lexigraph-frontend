"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, refresh_token: string, userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // On load, try to restore the user session
        const savedToken = Cookies.get("access_token");
        const savedUser = localStorage.getItem("user_data");

        if (savedToken && savedUser) {
            setToken(savedToken);
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse user data");
            }
        }
    }, []);

    const login = (newToken: string, refreshToken: string, userData: User) => {
        Cookies.set("access_token", newToken, { expires: 1 }); // expires in 1 day
        Cookies.set("refresh_token", refreshToken, { expires: 7 });
        localStorage.setItem("user_data", JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        router.push("/");
    };

    const logout = () => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        localStorage.removeItem("user_data");
        setToken(null);
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

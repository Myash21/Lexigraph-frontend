"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, MessageSquare, Network } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    // Don't show sidebar on auth pages
    if (pathname === "/login" || pathname === "/register") {
        return <>{children}</>;
    }

    const navLinks = [
        { name: "Dashboard", href: "/", icon: BookOpen },
        { name: "Chat", href: "/chat", icon: MessageSquare },
        { name: "Graph", href: "/graph", icon: Network },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Mobile Nav Header */}
            <div className="md:hidden fixed top-0 w-full h-14 border-b flex items-center justify-between px-4 bg-background z-50">
                <div className="font-bold text-lg text-brand">LexiGraph</div>
                <div className="flex gap-2">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            <Button variant={pathname === link.href ? "secondary" : "ghost"} size="icon" className="h-8 w-8">
                                <link.icon className="h-4 w-4" />
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 flex-col border-r bg-muted/40 p-4 justify-between">
                <div>
                    <div className="flex items-center gap-2 px-2 mb-8">
                        <div className="h-8 w-8 rounded bg-brand flex items-center justify-center text-white font-bold">L</div>
                        <span className="text-xl font-bold">LexiGraph</span>
                    </div>
                    <nav className="flex flex-col gap-2">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href}>
                                <Button
                                    variant={pathname === link.href ? "secondary" : "ghost"}
                                    className="w-full justify-start"
                                >
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.name}
                                </Button>
                            </Link>
                        ))}
                    </nav>
                </div>

                {user && (
                    <div className="border-t pt-4">
                        <div className="px-3 py-2 text-sm text-muted-foreground truncate mb-2">
                            {user.email}
                        </div>
                        <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <main className="flex-1 w-full flex flex-col pt-14 md:pt-0 h-screen overflow-y-auto">
                <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

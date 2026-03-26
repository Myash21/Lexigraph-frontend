"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Search, Network } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Types matching the backend response
interface Source {
    vector: Array<{ content: string; similarity: number }>;
    graph: string[];
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Source;
}

export default function ChatPage() {
    const { token, user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", role: "assistant", content: "Hello! I am LexiGraph. Ask me anything about your ingested documents." }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Typewriter effect simulation
    const simulateTyping = async (fullText: string, messageId: string, sources: Source) => {
        setCurrentTypingId(messageId);
        let currentText = "";
        const words = fullText.split(" ");

        for (let i = 0; i < words.length; i++) {
            currentText += (i === 0 ? "" : " ") + words[i];
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, content: currentText } : msg
            ));

            // Add random slight delay strictly for simulation (10-40ms per word)
            await new Promise(r => setTimeout(r, Math.random() * 30 + 10));
        }

        // After typing the text, attach the sources
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, sources } : msg
        ));
        setCurrentTypingId(null);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !token) return;

        const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/query`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ query: userMessage.content }),
            });

            if (!response.ok) throw new Error("Failed to fetch response");

            const data = await response.json();

            const assistantMessageId = (Date.now() + 1).toString();
            const newAssistantMessage: Message = {
                id: assistantMessageId,
                role: "assistant",
                content: "", // Starts empty for typewriter
            };

            setMessages(prev => [...prev, newAssistantMessage]);
            await simulateTyping(data.answer, assistantMessageId, data.sources);

        } catch (error) {
            toast.error("Lexigraph encountered an error processing your query.");
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "assistant",
                content: "Sorry, I encountered an error while retrieving that information."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
                <p className="text-muted-foreground mt-2">
                    Query the AI to search through your ingested knowledge graph.
                </p>
            </div>

            <div className="flex-1 border bg-background rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
                {/* Chat Message History */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto" ref={scrollRef}>
                    <div className="space-y-6 max-w-3xl mx-auto pb-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                                <Avatar className="h-10 w-10 shrink-0 border mt-1">
                                    {message.role === "assistant" ? (
                                        <div className="h-full w-full bg-brand/10 flex flex-col items-center justify-center text-brand">
                                            <Bot size={20} />
                                        </div>
                                    ) : (
                                        <div className="h-full w-full bg-muted flex flex-col items-center justify-center text-muted-foreground">
                                            <User size={20} />
                                        </div>
                                    )}
                                </Avatar>

                                <div className={`flex flex-col max-w-[80%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                                    <div className={`p-4 rounded-2xl inline-block ${message.role === "user"
                                            ? "bg-brand text-primary-foreground rounded-tr-sm"
                                            : "bg-muted/50 border rounded-tl-sm text-foreground"
                                        }`}>
                                        {message.content}
                                        {currentTypingId === message.id && (
                                            <span className="inline-block w-1.5 h-4 ml-1 bg-brand animate-pulse align-middle" />
                                        )}
                                    </div>

                                    {/* Render Attribution Cards AFTER typing finishes */}
                                    {message.role === "assistant" && message.sources && (message.sources.vector.length > 0 || message.sources.graph.length > 0) && (
                                        <div className="mt-3 space-y-3 w-full animate-in fade-in duration-500">

                                            {/* Vector Sources */}
                                            {message.sources.vector.length > 0 && (
                                                <Card className="bg-background shadow-sm overflow-hidden border-blue-500/20">
                                                    <CardContent className="p-0">
                                                        <div className="bg-blue-500/10 px-3 py-1.5 flex items-center justify-between border-b border-blue-500/10 hover:bg-blue-500/20 transition-colors">
                                                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                                                <Search size={14} /> Semantic Sources
                                                            </span>
                                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-blue-600 border-blue-200">
                                                                {message.sources.vector.length} match{message.sources.vector.length > 1 ? 'es' : ''}
                                                            </Badge>
                                                        </div>
                                                        <div className="divide-y text-sm">
                                                            {message.sources.vector.map((src, i) => (
                                                                <div key={i} className="p-3 text-muted-foreground">
                                                                    <div className="flex justify-between items-start gap-4 mb-1">
                                                                        <p className="line-clamp-3 leading-relaxed text-foreground/80 text-[13px] italic">"{src.content}"</p>
                                                                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                                                                            {(src.similarity * 100).toFixed(1)}% align
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Graph Sources */}
                                            {message.sources.graph.length > 0 && (
                                                <Card className="bg-background shadow-sm overflow-hidden border-purple-500/20">
                                                    <CardContent className="p-0">
                                                        <div className="bg-purple-500/10 px-3 py-1.5 flex items-center justify-between border-b border-purple-500/10 hover:bg-purple-500/20 transition-colors">
                                                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                                                                <Network size={14} /> Graph Relationships
                                                            </span>
                                                        </div>
                                                        <div className="p-3">
                                                            <div className="flex flex-wrap gap-2">
                                                                {message.sources.graph.map((edge, i) => (
                                                                    <Badge key={i} variant="outline" className="bg-purple-500/5 text-purple-700 border-purple-500/20 hover:bg-purple-500/10 rounded-md py-1">
                                                                        {edge}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background border-t">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2 relative">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isLoading ? "LexiGraph is thinking..." : "Ask a question about your knowledge graph..."}
                            className="pr-12 py-6 rounded-xl shadow-sm"
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="absolute right-1.5 top-1.5 h-9 w-9 rounded-lg"
                            disabled={isLoading || !input.trim()}
                        >
                            <Send size={18} />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

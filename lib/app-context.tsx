"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { useAuth } from "@/components/auth-provider";
import type { Node, Edge } from "@xyflow/react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

export interface Document {
    id: string;
    source: string;
    createdAt: string;
}

export interface GraphRawData {
    nodes: Array<{ id: string; type: string; source: string | null }>;
    edges: Array<{ source: string; target: string; type: string }>;
}

export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: {
        vector: Array<{ content: string; similarity: number }>;
        graph: string[];
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents context
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentsContextType {
    documents: Document[];
    isFetchingDocs: boolean;
    fetchDocsError: boolean;
    fetchDocuments: () => Promise<void>;
    /** Call after upload / delete to force a fresh fetch */
    invalidateDocs: () => Promise<void>;
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export function useDocuments(): DocumentsContextType {
    const ctx = useContext(DocumentsContext);
    if (!ctx) throw new Error("useDocuments must be used within AppProvider");
    return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph context
// ─────────────────────────────────────────────────────────────────────────────

interface GraphContextType {
    graphNodes: Node[];
    graphEdges: Edge[];
    isGraphLoading: boolean;
    graphFetchError: boolean;
    fetchGraph: () => Promise<void>;
    /** Call to force a fresh fetch (e.g. user presses Refresh) */
    invalidateGraph: () => Promise<void>;
    setGraphNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setGraphEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export function useGraph(): GraphContextType {
    const ctx = useContext(GraphContext);
    if (!ctx) throw new Error("useGraph must be used within AppProvider");
    return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat context
// ─────────────────────────────────────────────────────────────────────────────

interface ChatContextType {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat(): ChatContextType {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error("useChat must be used within AppProvider");
    return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// AppProvider — wrap all three contexts, lives in root layout (never unmounts)
// ─────────────────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
    const { token } = useAuth();

    // ── Documents ────────────────────────────────────────────────────────────
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isFetchingDocs, setIsFetchingDocs] = useState(false);
    const [fetchDocsError, setFetchDocsError] = useState(false);
    const docsFetchedRef = useRef(false);

    const fetchDocuments = useCallback(async () => {
        if (!token) return;
        setIsFetchingDocs(true);
        setFetchDocsError(false);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${apiUrl}/documents`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            const data = await res.json();
            setDocuments(data.documents);
            docsFetchedRef.current = true;
        } catch {
            setFetchDocsError(true);
            toast.error("Could not load documents. The server may be waking up — try again.");
        } finally {
            setIsFetchingDocs(false);
        }
    }, [token]);

    // Fetch once when a token becomes available
    useEffect(() => {
        if (token && !docsFetchedRef.current) {
            fetchDocuments();
        }
        // Reset flag when the user logs out so the next login re-fetches
        if (!token) {
            docsFetchedRef.current = false;
            setDocuments([]);
        }
    }, [token, fetchDocuments]);

    /** Explicit re-fetch (e.g. after upload / delete) */
    const invalidateDocs = useCallback(async () => {
        docsFetchedRef.current = false;
        await fetchDocuments();
    }, [fetchDocuments]);

    // ── Graph ─────────────────────────────────────────────────────────────────
    const [graphNodes, setGraphNodes] = useState<Node[]>([]);
    const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
    const [isGraphLoading, setIsGraphLoading] = useState(false);
    const [graphFetchError, setGraphFetchError] = useState(false);
    const graphFetchedRef = useRef(false);

    const fetchGraph = useCallback(async () => {
        if (!token) return;
        setIsGraphLoading(true);
        setGraphFetchError(false);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${apiUrl}/graph`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to load graph data");
            const data: GraphRawData = await res.json();
            graphFetchedRef.current = true;

            // Store raw data; the graph page will transform + layout when it mounts
            // We expose raw nodes/edges as React Flow Node/Edge so the page can
            // skip the transform step on subsequent visits.
            // Transformation and layout happen here so they are only done once.
            const colorMap: Record<string, string> = {
                PERSON: "#3b82f6",
                ORGANIZATION: "#a855f7",
                CONCEPT: "#22c55e",
                EVENT: "#f97316",
                LOCATION: "#ef4444",
            };

            const rfNodes: Node[] = data.nodes.map((n) => {
                const bgColor = colorMap[n.type.toUpperCase()] || "#94a3b8";
                return {
                    id: n.id,
                    data: { label: n.id, type: n.type, source: n.source },
                    position: { x: 0, y: 0 },
                    style: {
                        background: bgColor,
                        color: "white",
                        border: `1px solid ${bgColor}`,
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        padding: "8px 12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        opacity: 1,
                        transition: "all 0.3s ease",
                        maxWidth: "200px",
                        wordWrap: "break-word",
                        whiteSpace: "pre-wrap",
                        textAlign: "center",
                    },
                };
            });

            // Import dagre lazily to avoid SSR issues
            const dagre = (await import("dagre")).default;
            const dagreGraph = new dagre.graphlib.Graph();
            dagreGraph.setDefaultEdgeLabel(() => ({}));
            dagreGraph.setGraph({ rankdir: "LR" });

            rfNodes.forEach((node) => dagreGraph.setNode(node.id, { width: 150, height: 50 }));
            data.edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));
            dagre.layout(dagreGraph);

            rfNodes.forEach((node) => {
                const pos = dagreGraph.node(node.id);
                node.targetPosition = "left" as any;
                node.sourcePosition = "right" as any;
                node.position = {
                    x: pos.x - 75 + Math.random() * 50,
                    y: pos.y - 25 + Math.random() * 50,
                };
            });

            const { MarkerType } = await import("@xyflow/react");
            const rfEdges: Edge[] = data.edges.map((e, index) => ({
                id: `e${index}-${e.source}-${e.target}`,
                source: e.source,
                target: e.target,
                label: e.type,
                animated: true,
                style: { stroke: "#94a3b8", strokeWidth: 2, opacity: 1, transition: "all 0.3s ease" },
                labelStyle: { fill: "#64748b", fontWeight: 500, fontSize: "10px" },
                markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
            }));

            setGraphNodes(rfNodes);
            setGraphEdges(rfEdges);
        } catch {
            setGraphFetchError(true);
            toast.error("Could not render the knowledge graph.");
        } finally {
            setIsGraphLoading(false);
        }
    }, [token]);

    // Fetch graph once when token becomes available
    useEffect(() => {
        if (token && !graphFetchedRef.current) {
            fetchGraph();
        }
        if (!token) {
            graphFetchedRef.current = false;
            setGraphNodes([]);
            setGraphEdges([]);
        }
    }, [token, fetchGraph]);

    const invalidateGraph = useCallback(async () => {
        graphFetchedRef.current = false;
        await fetchGraph();
    }, [fetchGraph]);

    // ── Chat ──────────────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello! I am LexiGraph. Ask me anything about your ingested documents.",
        },
    ]);

    const clearChat = useCallback(() => {
        setMessages([
            {
                id: "welcome",
                role: "assistant",
                content: "Hello! I am LexiGraph. Ask me anything about your ingested documents.",
            },
        ]);
    }, []);

    // Reset chat on logout
    useEffect(() => {
        if (!token) clearChat();
    }, [token, clearChat]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <DocumentsContext.Provider
            value={{ documents, isFetchingDocs, fetchDocsError, fetchDocuments, invalidateDocs, setDocuments }}
        >
            <GraphContext.Provider
                value={{
                    graphNodes,
                    graphEdges,
                    isGraphLoading,
                    graphFetchError,
                    fetchGraph,
                    invalidateGraph,
                    setGraphNodes,
                    setGraphEdges,
                }}
            >
                <ChatContext.Provider value={{ messages, setMessages, clearChat }}>
                    {children}
                </ChatContext.Provider>
            </GraphContext.Provider>
        </DocumentsContext.Provider>
    );
}

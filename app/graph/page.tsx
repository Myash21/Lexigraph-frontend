"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info } from "lucide-react";
import dagre from "dagre";

interface GraphData {
    nodes: Array<{ id: string; type: string; source: string | null }>;
    edges: Array<{ source: string; target: string; type: string }>;
}

const colorMap: Record<string, string> = {
    PERSON: "#3b82f6",      // blue
    ORGANIZATION: "#a855f7",// purple
    CONCEPT: "#22c55e",     // green
    EVENT: "#f97316",       // orange
    LOCATION: "#ef4444",    // red
};

// Helper to auto-layout the graph using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "LR") => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 150, height: 50 }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = direction === "LR" ? "left" : "top" as any;
        node.sourcePosition = direction === "LR" ? "right" : "bottom" as any;
        // slightly randomize to avoid perfectly straight overlaps
        node.position = {
            x: nodeWithPosition.x - 75 + Math.random() * 50,
            y: nodeWithPosition.y - 25 + Math.random() * 50,
        };
    });

    return { nodes, edges };
};

export default function GraphPage() {
    const { token } = useAuth();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Track 1-hop highlights
    const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

    const fetchGraph = useCallback(async () => {
        if (!token) return;
        try {
            setIsLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${apiUrl}/graph`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to load graph data");
            const data: GraphData = await res.json();

            // Transform backend nodes to React Flow format
            const rfNodes: Node[] = data.nodes.map((n) => {
                const bgColor = colorMap[n.type.toUpperCase()] || "#94a3b8";
                return {
                    id: n.id,
                    data: { label: n.id, type: n.type, source: n.source },
                    position: { x: 0, y: 0 }, // computed in layout
                    style: {
                        background: bgColor,
                        color: "white",
                        border: `1px solid ${bgColor}`,
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        padding: "8px 12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        opacity: 1, // default full opacity
                        transition: "all 0.3s ease",
                    }
                };
            });

            // Transform backend edges
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

            // Apply auto layout
            const layouted = getLayoutedElements(rfNodes, rfEdges);
            setNodes(layouted.nodes);
            setEdges(layouted.edges);

        } catch (error) {
            toast.error("Could not render the knowledge graph.");
        } finally {
            setIsLoading(false);
        }
    }, [token, setNodes, setEdges]);

    // Initial fetch
    useEffect(() => {
        fetchGraph();
    }, [fetchGraph]);

    // Handle Node Click for 1-hop neighborhood & Sidebar Metadata
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);

        // Find all 1-hop connected nodes
        const connectedNodeIds = new Set<string>([node.id]);
        edges.forEach((edge) => {
            if (edge.source === node.id) connectedNodeIds.add(edge.target);
            if (edge.target === node.id) connectedNodeIds.add(edge.source);
        });

        setHighlightedNodes(connectedNodeIds);

        // Fade out non-connected nodes and edges
        setNodes((nds) => nds.map((n) => ({
            ...n,
            style: {
                ...n.style,
                opacity: connectedNodeIds.has(n.id) ? 1 : 0.2, // dim outsiders
                filter: connectedNodeIds.has(n.id) ? "none" : "grayscale(100%)",
                transform: n.id === node.id ? "scale(1.05)" : "scale(1)",
                boxShadow: n.id === node.id ? "0 0 0 4px rgba(0,0,0,0.1)" : n.style?.boxShadow,
            }
        })));

        setEdges((eds) => eds.map((e) => {
            const isConnected = e.source === node.id || e.target === node.id;
            return {
                ...e,
                style: { ...e.style, opacity: isConnected ? 1 : 0.1 },
                animated: isConnected,
            };
        }));
    }, [edges, setNodes, setEdges]);

    // Reset highlight on pane click
    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        setHighlightedNodes(new Set());

        setNodes((nds) => nds.map((n) => ({
            ...n,
            style: { ...n.style, opacity: 1, filter: "none", transform: "scale(1)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
        })));

        setEdges((eds) => eds.map((e) => ({
            ...e,
            style: { ...e.style, opacity: 1 },
            animated: true,
        })));
    }, [setNodes, setEdges]);

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Knowledge Graph</h1>
                    <p className="text-muted-foreground mt-2">
                        Explore the entities and relationships extracted from your documents.
                    </p>
                </div>
                <div className="hidden md:flex gap-2 p-2 bg-muted/30 rounded-lg border">
                    {Object.entries(colorMap).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                            {type}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                <div className="flex-1 bg-white dark:bg-zinc-950 border rounded-xl overflow-hidden shadow-sm relative">

                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
                            <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
                            <p className="text-muted-foreground font-medium">Loading network data...</p>
                        </div>
                    ) : nodes.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <Info className="h-10 w-10 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium text-foreground">No graph data found</p>
                            <p className="text-muted-foreground">Ingest some documents or URLs first.</p>
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            fitView
                            attributionPosition="bottom-right"
                            minZoom={0.1}
                            maxZoom={2}
                        >
                            <Background gap={24} size={2} color="#94a3b8" className="opacity-20" />
                            <Controls className="bg-background shadow-md border rounded-md overflow-hidden fill-foreground" />
                        </ReactFlow>
                    )}
                </div>

                {/* Sidebar Panel for Node Metadata */}
                {selectedNode && (
                    <Card className="w-80 h-full overflow-y-auto animate-in slide-in-from-right-4 bg-background shadow-lg">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center justify-between">
                                Entity Details
                                <Badge style={{ backgroundColor: colorMap[String(selectedNode.data.type)] || "#94a3b8" }} className="ml-2 text-white">
                                    {String(selectedNode.data.type)}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Identifier</h3>
                                <p className="font-medium break-all">{String(selectedNode.data.label)}</p>
                            </div>

                            {Boolean(selectedNode.data.source) && (
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Source Document</h3>
                                    <p className="text-sm font-medium p-2 bg-muted/50 rounded-md truncate break-all" title={String(selectedNode.data.source)}>
                                        {String(selectedNode.data.source)}
                                    </p>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Connections</h3>
                                <div className="space-y-2">
                                    {edges.filter(e => e.source === selectedNode.id).map((edge, i) => (
                                        <div key={i} className="text-xs p-2 bg-muted/30 border rounded-md">
                                            <span className="text-muted-foreground font-mono">-[{edge.label}]-&gt;</span>{" "}
                                            <span className="font-medium ml-1">{edge.target}</span>
                                        </div>
                                    ))}
                                    {edges.filter(e => e.target === selectedNode.id).map((edge, i) => (
                                        <div key={i} className="text-xs p-2 bg-muted/30 border rounded-md">
                                            <span className="text-muted-foreground font-mono">&lt;-[{edge.label}]-</span>{" "}
                                            <span className="font-medium ml-1">{edge.source}</span>
                                        </div>
                                    ))}
                                    {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">No connections</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

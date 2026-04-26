"use client";

import { useCallback, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, X, RefreshCw } from "lucide-react";
import { useGraph } from "@/lib/app-context";

const colorMap: Record<string, string> = {
    PERSON: "#3b82f6",
    ORGANIZATION: "#a855f7",
    CONCEPT: "#22c55e",
    EVENT: "#f97316",
    LOCATION: "#ef4444",
};

export default function GraphPage() {
    const { graphNodes, graphEdges, isGraphLoading, graphFetchError, invalidateGraph } = useGraph();

    // React Flow manages its own local copy for highlight mutations
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(graphNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graphEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Seed React Flow state when context loads for the first time
    if (graphNodes.length > 0 && nodes.length === 0) {
        setNodes(graphNodes);
        setEdges(graphEdges);
    }

    const handleRefresh = useCallback(async () => {
        setSelectedNode(null);
        await invalidateGraph();
        setNodes(graphNodes);
        setEdges(graphEdges);
    }, [invalidateGraph, graphNodes, graphEdges, setNodes, setEdges]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        const connected = new Set<string>([node.id]);
        edges.forEach((e) => {
            if (e.source === node.id) connected.add(e.target);
            if (e.target === node.id) connected.add(e.source);
        });
        setNodes((nds) => nds.map((n) => ({
            ...n,
            style: {
                ...n.style,
                opacity: connected.has(n.id) ? 1 : 0.2,
                filter: connected.has(n.id) ? "none" : "grayscale(100%)",
                boxShadow: n.id === node.id ? "0 0 0 4px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.1)",
            },
        })));
        setEdges((eds) => eds.map((e) => {
            const isConn = e.source === node.id || e.target === node.id;
            return { ...e, style: { ...e.style, opacity: isConn ? 1 : 0.1 }, animated: isConn };
        }));
    }, [edges, setNodes, setEdges]);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        setNodes((nds) => nds.map((n) => ({
            ...n, style: { ...n.style, opacity: 1, filter: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
        })));
        setEdges((eds) => eds.map((e) => ({ ...e, style: { ...e.style, opacity: 1 }, animated: true })));
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
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRefresh}
                        disabled={isGraphLoading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isGraphLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <div className="hidden md:flex gap-2 p-2 bg-muted/30 rounded-lg border">
                        {Object.entries(colorMap).map(([type, color]) => (
                            <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                {type}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                <div className="flex-1 bg-white dark:bg-zinc-950 border rounded-xl overflow-hidden shadow-sm relative">

                    {isGraphLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
                            <Loader2 className="h-8 w-8 animate-spin text-brand mb-4" />
                            <p className="text-muted-foreground font-medium">Loading network data...</p>
                        </div>
                    ) : graphFetchError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4">
                            <Info className="h-10 w-10 text-muted-foreground" />
                            <p className="text-lg font-medium">Failed to load graph</p>
                            <p className="text-muted-foreground text-sm">The server may be waking up.</p>
                            <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                                <RefreshCw className="h-4 w-4" /> Retry
                            </button>
                        </div>
                    ) : nodes.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <Info className="h-10 w-10 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium text-foreground">No graph data found</p>
                            <p className="text-muted-foreground">Ingest some documents or URLs first.</p>
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes} edges={edges}
                            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                            onNodeClick={onNodeClick} onPaneClick={onPaneClick}
                            fitView attributionPosition="bottom-right" minZoom={0.1} maxZoom={2}
                        >
                            <Background gap={24} size={2} color="#94a3b8" className="opacity-20" />
                            <Controls className="bg-background shadow-md border rounded-md overflow-hidden fill-foreground" />
                        </ReactFlow>
                    )}

                    {selectedNode && (
                        <Card className="absolute top-4 right-4 z-10 w-80 max-h-[calc(100%-2rem)] overflow-y-auto animate-in slide-in-from-right-4 bg-background shadow-lg border">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        Entity Details
                                        <Badge style={{ backgroundColor: colorMap[String(selectedNode.data.type)] || "#94a3b8" }} className="text-white">
                                            {String(selectedNode.data.type)}
                                        </Badge>
                                    </div>
                                    <button onClick={onPaneClick} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Close panel">
                                        <X className="h-5 w-5" />
                                    </button>
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
                                        <p className="text-sm font-medium p-2 bg-muted/50 rounded-md break-all" title={String(selectedNode.data.source)}>
                                            {String(selectedNode.data.source)}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Connections</h3>
                                    <div className="space-y-2">
                                        {edges.filter(e => e.source === selectedNode.id).map((edge, i) => (
                                            <div key={i} className="text-xs p-2 bg-muted/30 border rounded-md">
                                                <span className="text-muted-foreground font-mono">-[{edge.label as string}]-&gt;</span>{" "}
                                                <span className="font-medium ml-1">{edge.target}</span>
                                            </div>
                                        ))}
                                        {edges.filter(e => e.target === selectedNode.id).map((edge, i) => (
                                            <div key={i} className="text-xs p-2 bg-muted/30 border rounded-md">
                                                <span className="text-muted-foreground font-mono">&lt;-[{edge.label as string}]-</span>{" "}
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
        </div>
    );
}

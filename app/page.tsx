"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Link as LinkIcon, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth-provider";

// Mock types for documents list
interface Document {
  id: string;
  filename: string;
  sourceType: "file" | "url";
  createdAt: string;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlInput, setUrlInput] = useState("");

  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (!token) return;

    const fetchDocuments = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/documents`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setDocuments(data);
        }
      } catch (error) {
        console.error("Failed to fetch documents", error);
      }
    };

    fetchDocuments();
  }, [token]);

  const handleUpload = async (file: File) => {
    if (!token) {
      toast.error("You must be logged in to upload files.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress while waiting for the API
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/ingest`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Failed to upload document");
      }

      toast.success("Document successfully uploaded and ingested");

      // Update our mock list
      setDocuments(prev => [
        { id: Math.random().toString(), filename: file.name, sourceType: "file", createdAt: new Date().toISOString() },
        ...prev
      ]);

    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      toast.error(error instanceof Error ? error.message : "Error uploading file");
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles[0]);
    }
  }, [token]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    }
  });

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    if (!token) {
      toast.error("You must be logged in to ingest URLs.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(30);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/ingest`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: urlInput }),
      });

      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Failed to ingest URL");
      }

      toast.success("URL successfully ingested");

      setDocuments(prev => [
        { id: Math.random().toString(), filename: urlInput, sourceType: "url", createdAt: new Date().toISOString() },
        ...prev
      ]);
      setUrlInput("");

    } catch (error) {
      setUploadProgress(0);
      toast.error("Error ingesting URL");
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Upload documents or provide URLs to build your knowledge graph.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Ingest Data</h2>

            {/* Drag & Drop Zone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-200
                ${isDragActive ? "border-brand bg-brand/5" : "border-border hover:border-brand/50 hover:bg-muted/50"}
                ${isUploading ? "pointer-events-none opacity-50" : ""}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-medium text-lg">
                    {isDragActive ? "Drop your file here..." : "Click or drag file to upload"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports PDF, TXT, MD up to 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* URL Ingest Form */}
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-3 overflow-hidden text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="https://example.com/article"
                  className="pl-9"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <Button type="submit" disabled={isUploading || !urlInput.trim()}>
                Ingest URL
              </Button>
            </form>

            {/* Progress Indicator */}
            {isUploading && (
              <div className="space-y-2 animate-in fade-in">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Processing...
                  </span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-4 bg-muted/20 p-6 rounded-xl border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            Ingested Documents
          </h2>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">
                No documents ingested yet.
              </p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-background border shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-brand/10 p-2 rounded-md text-brand">
                      {doc.sourceType === "file" ? <FileText className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                    </div>
                    <div className="truncate pr-4">
                      <p className="font-medium text-sm truncate">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

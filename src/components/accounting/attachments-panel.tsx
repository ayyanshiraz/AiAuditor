"use client";
import { useEffect, useState } from "react";
import { Paperclip, Trash2, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Attachment {
  id: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  createdAt: string;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Metadata/reference-based attachments: this panel never holds file bytes
 * itself — it uploads via multipart form data to the API, which stores the
 * bytes through the storage provider (local disk in dev, S3-compatible in
 * production) and keeps only a metadata row (fileName/fileType/fileSize/
 * storageKey) in the database.
 */
export function AttachmentsPanel({
  companyId,
  journalEntryId,
  canEdit,
}: {
  companyId: string;
  journalEntryId: string;
  canEdit: boolean;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ items: Attachment[] }>(
        `/api/companies/${companyId}/attachments?journalEntryId=${journalEntryId}`
      );
      setItems(data.items);
    } catch {
      // Non-critical panel — fail quietly, the rest of the page still works.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalEntryId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("journalEntryId", journalEntryId);
      const res = await fetch(`/api/companies/${companyId}/attachments`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast.success("Attachment uploaded.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onDownload(id: string) {
    const data = await api.get<{ url: string }>(`/api/companies/${companyId}/attachments/${id}`);
    window.open(data.url, "_blank");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4" /> Attachments
        </CardTitle>
        {canEdit && (
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
            <Button asChild size="sm" variant="outline" disabled={uploading}>
              <span>{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Attach file"}</span>
            </Button>
          </label>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No attachments on this entry.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {items.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.fileName}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(a.fileSize)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="rounded-md p-1.5 hover:bg-[var(--surface-muted)]"
                    onClick={() => onDownload(a.id)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {canEdit && (
                    <button
                      className="rounded-md p-1.5 text-[var(--danger)] hover:bg-[var(--surface-muted)]"
                      onClick={async () => {
                        if (!confirm("Delete this attachment?")) return;
                        await fetch(`/api/companies/${companyId}/attachments/${a.id}`, { method: "DELETE" });
                        toast.success("Attachment deleted.");
                        await load();
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const data = await api.get<{ items: NotificationItem[]; unreadCount: number }>("/api/notifications");
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Notifications are non-critical — fail silently rather than blocking the UI.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await api.post("/api/notifications/mark-all-read");
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnreadCount(0);
  }

  async function markOneRead(id: string) {
    await api.post(`/api/notifications/${id}/read`);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <DropdownMenuTrigger className="relative rounded-md p-2 hover:bg-[var(--surface-muted)]">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-[var(--primary)] hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-[var(--muted-foreground)]">No notifications yet.</p>
          )}
          {items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-0.5 whitespace-normal"
              onClick={() => !n.isRead && markOneRead(n.id)}
            >
              <span className="flex w-full items-center gap-1.5 text-sm font-medium">
                {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />}
                {n.title}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">{n.message}</span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

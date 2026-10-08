"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
// Type-only import (erased at build) — no server code is bundled client-side.
import type { SearchResult } from "@/server/services/search";

export function TopbarSearch({ companyId }: { companyId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const data = await api.get<{ results: SearchResult[] }>(
          `/api/companies/${companyId}/search?q=${encodeURIComponent(q)}`
        );
        setResults(data.results);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, companyId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-sm sm:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="Search transactions, customers, accounts…"
        className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      {loading && (
        <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--muted-foreground)]" />
      )}
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {results.length === 0 && !loading && (
            <p className="p-3 text-sm text-[var(--muted-foreground)]">No results for &ldquo;{query}&rdquo;.</p>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="border-b border-[var(--border)] last:border-0">
              <p className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                {category}
              </p>
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block px-3 py-2 text-sm hover:bg-[var(--surface-muted)]"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    router.push(item.href);
                  }}
                >
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{item.subtitle}</p>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export type SearchGroup = {
  category: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    url: string;
    badge?: string;
  }>;
};

export function GlobalSearchDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    setLoading(false);
    onClose();
  }, [onClose]);

  // Flattened items for keyboard navigation
  const displayedResults = query.trim().length >= 2 ? results : [];
  const flatItems = displayedResults.flatMap((group) => group.items);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        }
      }
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.groups || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(url: string) {
    handleClose();
    router.push(url);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatItems[selectedIndex];
      if (target) {
        handleSelect(target.url);
      }
    }
  }

  if (!isOpen) return null;

  let runningIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/60 backdrop-blur-xs p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global search command palette"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-line gap-3">
          <svg
            className="w-5 h-5 text-muted shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-sm sm:text-base text-ink placeholder:text-muted focus:outline-hidden"
            placeholder="Search drivers, bikes, contracts, maintenance, emergencies, parts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search query input"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-line border-t-amber-600 rounded-full animate-spin shrink-0" />
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-paper border border-line rounded text-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-line/40">
          {query.trim().length >= 2 && flatItems.length === 0 && !loading && (
            <div className="py-8 text-center text-sm text-muted">
              No matching records found for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-6 px-4 text-xs text-muted space-y-2">
              <p className="font-semibold text-ink">QUICK SHORTCUTS</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelect("/management/drivers")}
                  className="p-2 rounded bg-paper/60 hover:bg-paper text-left flex items-center justify-between border border-line/50 cursor-pointer"
                >
                  <span>Drivers register</span>
                  <span className="text-[10px] text-muted">Jump to →</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect("/management/bikes")}
                  className="p-2 rounded bg-paper/60 hover:bg-paper text-left flex items-center justify-between border border-line/50 cursor-pointer"
                >
                  <span>Motorcycles fleet</span>
                  <span className="text-[10px] text-muted">Jump to →</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect("/management/analytics")}
                  className="p-2 rounded bg-paper/60 hover:bg-paper text-left flex items-center justify-between border border-line/50 cursor-pointer"
                >
                  <span>Operations analytics</span>
                  <span className="text-[10px] text-muted">Jump to →</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect("/management/emergency")}
                  className="p-2 rounded bg-paper/60 hover:bg-paper text-left flex items-center justify-between border border-line/50 cursor-pointer"
                >
                  <span>Emergency dispatch</span>
                  <span className="text-[10px] text-muted">Jump to →</span>
                </button>
              </div>
            </div>
          )}

          {results.map((group) => (
            <div key={group.category} className="py-2 first:pt-0 last:pb-0">
              <div className="px-3 py-1 text-[11px] font-bold tracking-wider uppercase text-muted">
                {group.category}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const itemIndex = runningIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/10 text-amber-950 dark:text-amber-200"
                          : "hover:bg-paper text-ink"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{item.title}</div>
                        <div className="text-muted text-[11px] truncate">{item.subtitle}</div>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-paper border border-line font-medium text-muted shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 bg-paper/40 border-t border-line text-[11px] text-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-paper border border-line px-1 rounded">↑</kbd>
              <kbd className="font-mono bg-paper border border-line px-1 rounded ml-1">↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono bg-paper border border-line px-1 rounded">↵</kbd> select
            </span>
          </div>
          <span>Universal VMC Register</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trash2,
  History,
  ArrowLeft,
  Search,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  X,
  ExternalLink
} from "lucide-react";

interface HistoryItem {
  type?: "url" | "search";
  url?: string;
  query?: string;
  title?: string;
  timestamp?: number;
}

export default function LocalHistoryPage() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from localStorage on mount
  useEffect(() => {
    loadLocalHistory();
  }, []);

  const loadLocalHistory = () => {
    setIsLoading(true);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const historyStr = localStorage.getItem("browser-history-v1") || "[]";
        const parsed = JSON.parse(historyStr);
        if (Array.isArray(parsed)) {
          setHistoryList(parsed);
        } else {
          setHistoryList([]);
        }
      }
    } catch (err) {
      console.error("Failed to load local history:", err);
      setHistoryList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Delete all local history entries
  const handleDeleteAllLocalHistory = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem("browser-history-v1");
      }
      setHistoryList([]);
      setShowConfirmModal(false);
      showToast("Local history has been completely deleted.");
    } catch (err) {
      console.error("Failed to delete local history:", err);
      showToast("Error deleting local history.");
    }
  };

  // Delete a single item from local history
  const handleDeleteSingleItem = (indexToDelete: number) => {
    try {
      const updatedList = historyList.filter((_, idx) => idx !== indexToDelete);
      setHistoryList(updatedList);
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("browser-history-v1", JSON.stringify(updatedList));
      }
      showToast("Item deleted from local history.");
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const filteredHistory = historyList.filter((item) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const matchUrl = item.url?.toLowerCase().includes(term);
    const matchQuery = item.query?.toLowerCase().includes(term);
    const matchTitle = item.title?.toLowerCase().includes(term);
    return matchUrl || matchQuery || matchTitle;
  });

  const formatTimestamp = (ts?: number) => {
    if (!ts) return "Unknown time";
    try {
      return new Date(ts).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch {
      return "Unknown time";
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f8f6] text-[#191919] font-sans flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#191919] text-white px-4 py-3 rounded-lg shadow-xl border border-gray-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f4f3ee] border border-[#e3e0d5] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#191919]">Delete Local History</h3>
            </div>
            
            <p className="text-sm text-[#6e6b5e] leading-relaxed">
              Are you sure you want to delete all local history entries? This action will immediately purge all browsing and search activity stored in your browser&apos;s local storage. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#191919] hover:bg-[#e9e6dc] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllLocalHistory}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="border-b border-[#e3e0d5] bg-[#e9e6dc]/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-[#e3e0d5] text-[#6e6b5e] hover:text-[#191919] transition-colors flex items-center gap-1.5 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Browser</span>
            </Link>
            <div className="h-5 w-px bg-[#e3e0d5]" />
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#c15f3c]/10 text-[#c15f3c] rounded-lg">
                <History className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#191919]">Local History</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadLocalHistory}
              title="Refresh local history"
              className="p-2 text-[#6e6b5e] hover:text-[#191919] hover:bg-[#e3e0d5] rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={historyList.length === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Local History</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Banner / Info Card */}
        <div className="bg-[#f4f3ee] border border-[#e3e0d5] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#c15f3c]" />
              <h2 className="text-lg font-semibold text-[#191919]">Local History Storage</h2>
            </div>
            <p className="text-sm text-[#6e6b5e]">
              History is stored privately inside your browser&apos;s localStorage (<code className="bg-[#e9e6dc] px-1.5 py-0.5 rounded text-xs text-[#191919]">browser-history-v1</code>).
            </p>
          </div>
          <div className="flex items-center gap-4 bg-[#e9e6dc]/70 px-4 py-2.5 rounded-xl border border-[#e3e0d5]">
            <div className="text-center px-2">
              <div className="text-2xl font-bold text-[#c15f3c]">{historyList.length}</div>
              <div className="text-xs text-[#6e6b5e] font-medium">Saved Items</div>
            </div>
            <div className="h-8 w-px bg-[#e3e0d5]" />
            <div className="text-center px-2">
              <div className="text-xs text-[#6e6b5e] font-medium">Storage Status</div>
              <div className="text-sm font-semibold text-green-700 flex items-center justify-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Active
              </div>
            </div>
          </div>
        </div>

        {/* Controls Header & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6e6b5e]" />
            <input
              type="text"
              placeholder="Search local history..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[#f4f3ee] border border-[#e3e0d5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c15f3c]/40 text-[#191919] placeholder-[#6e6b5e]"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6b5e] hover:text-[#191919]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-[#6e6b5e]">
            Showing {filteredHistory.length} of {historyList.length} total entries
          </div>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="py-16 text-center text-[#6e6b5e] space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#c15f3c]" />
            <p className="text-sm">Loading local history...</p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="space-y-3">
            {filteredHistory.map((item, idx) => {
              const originalIndex = historyList.findIndex((h) => h === item);
              const isUrl = item.type === "url" || !!item.url;

              return (
                <div
                  key={idx}
                  className="bg-[#f4f3ee] border border-[#e3e0d5] rounded-xl p-4 hover:border-[#c15f3c]/30 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${isUrl ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {isUrl ? <Globe className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#191919] truncate">
                          {item.title || item.query || item.url || "Untitled"}
                        </span>
                        {isUrl && item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#6e6b5e] hover:text-[#c15f3c] shrink-0"
                            title="Open link in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {isUrl && item.url && (
                        <p className="text-xs text-[#6e6b5e] truncate font-mono">{item.url}</p>
                      )}
                      {!isUrl && item.query && (
                        <p className="text-xs text-[#6e6b5e] truncate">Search Query: &quot;{item.query}&quot;</p>
                      )}

                      <div className="flex items-center gap-1.5 text-[11px] text-[#6e6b5e] pt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSingleItem(originalIndex !== -1 ? originalIndex : idx)}
                    title="Delete item from local history"
                    className="p-2 text-[#6e6b5e] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#f4f3ee] border border-dashed border-[#e3e0d5] rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-[#e9e6dc] text-[#6e6b5e] rounded-full flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[#191919]">No Local History Found</h3>
              <p className="text-xs text-[#6e6b5e] max-w-sm mx-auto">
                {searchFilter
                  ? "No local history items match your search query."
                  : "Your local browsing history is empty or has been cleared."}
              </p>
            </div>
            {searchFilter && (
              <button
                onClick={() => setSearchFilter("")}
                className="px-3 py-1.5 text-xs bg-[#e9e6dc] hover:bg-[#e3e0d5] text-[#191919] rounded-lg transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Bounty, PullRequest, GitHubIssue, Stats } from "@/lib/types";
import {
  getBounties, addBounty, updateBounty, removeBounty,
  getPRs, addPR, updatePR, removePR,
} from "@/lib/storage";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  working: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  submitted: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  won: "bg-green-500/20 text-green-400 border-green-500/30",
  expired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  review: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  merged: "bg-green-500/20 text-green-400 border-green-500/30",
  closed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function Home() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [prs, setPRs] = useState<PullRequest[]>([]);
  const [searchResults, setSearchResults] = useState<GitHubIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "bounties" | "prs" | "discover">("dashboard");
  const [showAddBounty, setShowAddBounty] = useState(false);
  const [showAddPR, setShowAddPR] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingBounty, setEditingBounty] = useState<string | null>(null);
  const [editingPR, setEditingPR] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setBounties(getBounties());
    setPRs(getPRs());
  }, []);

  const stats: Stats = {
    totalBounties: bounties.length,
    openBounties: bounties.filter((b) => b.status === "open" || b.status === "working").length,
    totalValue: bounties.reduce((sum, b) => sum + b.amount, 0),
    wonValue: bounties.filter((b) => b.status === "won").reduce((sum, b) => sum + b.amount, 0),
    totalPRs: prs.length,
    mergedPRs: prs.filter((p) => p.status === "merged").length,
  };

  const searchGitHub = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery + " label:bounty")}&sort=created&order=desc&per_page=20`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.items || []);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleAddBounty = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const repo = formData.get("repo") as string;
    const bounty: Bounty = {
      id: Date.now().toString(),
      repo,
      issueNumber: parseInt(formData.get("issueNumber") as string) || 0,
      title: formData.get("title") as string,
      amount: parseFloat(formData.get("amount") as string) || 0,
      status: "open",
      url: `https://github.com/${repo}/issues/${formData.get("issueNumber")}`,
      labels: [],
      createdAt: new Date().toISOString(),
      addedAt: new Date().toISOString(),
      notes: formData.get("notes") as string || "",
    };
    setBounties(addBounty(bounty));
    setShowAddBounty(false);
    form.reset();
  };

  const handleAddPR = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const repo = formData.get("repo") as string;
    const pr: PullRequest = {
      id: Date.now().toString(),
      repo,
      prNumber: parseInt(formData.get("prNumber") as string) || 0,
      title: formData.get("title") as string,
      status: "pending",
      url: `https://github.com/${repo}/pull/${formData.get("prNumber")}`,
      bountyId: formData.get("bountyId") as string || undefined,
      createdAt: new Date().toISOString(),
      addedAt: new Date().toISOString(),
    };
    setPRs(addPR(pr));
    setShowAddPR(false);
    form.reset();
  };

  const importFromSearch = (issue: GitHubIssue) => {
    const repoPath = issue.repository_url.replace("https://api.github.com/repos/", "");
    const amountLabel = issue.labels.find((l) => l.name.toLowerCase().includes("bounty") || l.name.includes("$"));
    const amount = amountLabel ? parseFloat(amountLabel.name.replace(/[^0-9.]/g, "")) || 0 : 0;
    const bounty: Bounty = {
      id: issue.id.toString(),
      repo: repoPath,
      issueNumber: issue.number,
      title: issue.title,
      amount,
      status: "open",
      url: issue.html_url,
      labels: issue.labels.map((l) => l.name),
      createdAt: issue.created_at,
      addedAt: new Date().toISOString(),
    };
    setBounties(addBounty(bounty));
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <h1 className="text-xl font-bold text-white">Bounty Tracker</h1>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">v2.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b949e]">Data stored locally in your browser</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {(["dashboard", "bounties", "prs", "discover"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-[#58a6ff] text-white"
                  : "border-transparent text-[#8b949e] hover:text-white"
              }`}
            >
              {tab === "dashboard" && "📊 "}
              {tab === "bounties" && "💰 "}
              {tab === "prs" && "🔀 "}
              {tab === "discover" && "🔍 "}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: "Total Bounties", value: stats.totalBounties, color: "text-[#58a6ff]" },
                { label: "Active", value: stats.openBounties, color: "text-yellow-400" },
                { label: "Total Value", value: `$${stats.totalValue.toLocaleString()}`, color: "text-green-400" },
                { label: "Won", value: `$${stats.wonValue.toLocaleString()}`, color: "text-green-300" },
                { label: "PRs", value: stats.totalPRs, color: "text-[#58a6ff]" },
                { label: "Merged", value: stats.mergedPRs, color: "text-green-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-[#8b949e] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">💰 Recent Bounties</h2>
                {bounties.length === 0 ? (
                  <p className="text-[#8b949e] text-sm">No bounties tracked yet. Add one or discover bounties.</p>
                ) : (
                  <div className="space-y-2">
                    {bounties.slice(0, 5).map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                        <div className="min-w-0">
                          <a href={b.url} target="_blank" rel="noopener" className="text-sm font-medium text-[#58a6ff] hover:underline truncate block">
                            #{b.issueNumber} {b.title}
                          </a>
                          <span className="text-xs text-[#8b949e]">{b.repo}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          {b.amount > 0 && <span className="text-sm font-bold text-green-400">${b.amount}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">🔀 Recent PRs</h2>
                {prs.length === 0 ? (
                  <p className="text-[#8b949e] text-sm">No PRs tracked yet. Add one from the PRs tab.</p>
                ) : (
                  <div className="space-y-2">
                    {prs.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                        <div className="min-w-0">
                          <a href={p.url} target="_blank" rel="noopener" className="text-sm font-medium text-[#58a6ff] hover:underline truncate block">
                            #{p.prNumber} {p.title}
                          </a>
                          <span className="text-xs text-[#8b949e]">{p.repo}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ml-3 ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bounties Tab */}
        {activeTab === "bounties" && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Tracked Bounties</h2>
              <button onClick={() => setShowAddBounty(!showAddBounty)} className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                + Add Bounty
              </button>
            </div>

            {showAddBounty && (
              <form onSubmit={handleAddBounty} className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 mb-6 animate-fade-in">
                <div className="grid md:grid-cols-2 gap-4">
                  <input name="repo" placeholder="owner/repo" required className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none" />
                  <input name="issueNumber" type="number" placeholder="Issue #" required className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none" />
                  <input name="title" placeholder="Bounty title" required className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none" />
                  <input name="amount" type="number" step="0.01" placeholder="Amount ($)" className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none" />
                  <input name="notes" placeholder="Notes (optional)" className="md:col-span-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
                  <button type="button" onClick={() => setShowAddBounty(false)} className="bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {bounties.length === 0 ? (
                <div className="text-center py-16 text-[#8b949e]">
                  <p className="text-4xl mb-4">🎯</p>
                  <p>No bounties tracked yet.</p>
                  <p className="text-sm mt-2">Add a bounty manually or discover them in the Discover tab.</p>
                </div>
              ) : (
                bounties.map((b) => (
                  <div key={b.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#58a6ff]/30 transition-colors">
                    {editingBounty === b.id ? (
                      <div className="flex gap-2 items-center flex-wrap">
                        <select
                          defaultValue={b.status}
                          onChange={(e) => {
                            updateBounty(b.id, { status: e.target.value as Bounty["status"] });
                            setBounties(getBounties());
                            setEditingBounty(null);
                          }}
                          className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm"
                        >
                          {["open", "working", "submitted", "won", "expired"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          defaultValue={b.amount}
                          onBlur={(e) => {
                            updateBounty(b.id, { amount: parseFloat(e.target.value) || 0 });
                            setBounties(getBounties());
                            setEditingBounty(null);
                          }}
                          className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm w-24"
                        />
                        <button onClick={() => setEditingBounty(null)} className="text-xs text-[#8b949e] hover:text-white">Done</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <a href={b.url} target="_blank" rel="noopener" className="font-medium text-[#58a6ff] hover:underline truncate">
                              #{b.issueNumber} {b.title}
                            </a>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                            <span>{b.repo}</span>
                            {b.labels.length > 0 && (
                              <span className="flex gap-1">
                                {b.labels.slice(0, 3).map((l) => (
                                  <span key={l} className="bg-[#21262d] px-1.5 py-0.5 rounded">{l}</span>
                                ))}
                              </span>
                            )}
                          </div>
                          {b.notes && <p className="text-xs text-[#8b949e] mt-1">{b.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          {b.amount > 0 && <span className="text-lg font-bold text-green-400">${b.amount}</span>}
                          <button onClick={() => setEditingBounty(b.id)} className="text-[#8b949e] hover:text-white text-sm" title="Edit">✏️</button>
                          <button
                            onClick={() => { removeBounty(b.id); setBounties(getBounties()); }}
                            className="text-[#8b949e] hover:text-red-400 text-sm"
                            title="Remove"
                          >🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PRs Tab */}
        {activeTab === "prs" && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Pull Requests</h2>
              <button onClick={() => setShowAddPR(!showAddPR)} className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                + Add PR
              </button>
            </div>

            {showAddPR && (
              <form onSubmit={handleAddPR} className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 mb-6 animate-fade-in">
                <div className="grid md:grid-cols-2 gap-4">
                  <input name="repo" placeholder="owner/repo" required className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none" />
                  <input name="prNumber" type="number" placeholder="PR #" required className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none" />
                  <input name="title" placeholder="PR title" required className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none" />
                  <select name="bountyId" className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm focus:border-[#58a6ff] focus:outline-none">
                    <option value="">Link to bounty (optional)</option>
                    {bounties.map((b) => (
                      <option key={b.id} value={b.id}>#{b.issueNumber} {b.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
                  <button type="button" onClick={() => setShowAddPR(false)} className="bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] px-4 py-2 rounded-lg text-sm">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {prs.length === 0 ? (
                <div className="text-center py-16 text-[#8b949e]">
                  <p className="text-4xl mb-4">🔀</p>
                  <p>No PRs tracked yet.</p>
                </div>
              ) : (
                prs.map((p) => (
                  <div key={p.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#58a6ff]/30 transition-colors">
                    {editingPR === p.id ? (
                      <div className="flex gap-2 items-center">
                        <select
                          defaultValue={p.status}
                          onChange={(e) => {
                            updatePR(p.id, { status: e.target.value as PullRequest["status"] });
                            setPRs(getPRs());
                            setEditingPR(null);
                          }}
                          className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm"
                        >
                          {["pending", "review", "merged", "closed"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button onClick={() => setEditingPR(null)} className="text-xs text-[#8b949e] hover:text-white">Done</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <a href={p.url} target="_blank" rel="noopener" className="font-medium text-[#58a6ff] hover:underline">
                              #{p.prNumber} {p.title}
                            </a>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                          </div>
                          <span className="text-xs text-[#8b949e]">{p.repo}</span>
                          {p.bountyId && (
                            <span className="text-xs text-green-400 ml-2">
                              Linked: {bounties.find((b) => b.id === p.bountyId)?.title || "Unknown"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <button onClick={() => setEditingPR(p.id)} className="text-[#8b949e] hover:text-white text-sm">✏️</button>
                          <button
                            onClick={() => { removePR(p.id); setPRs(getPRs()); }}
                            className="text-[#8b949e] hover:text-red-400 text-sm"
                          >🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Discover Tab */}
        {activeTab === "discover" && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Discover Bounties on GitHub</h2>
            <div className="flex gap-2 mb-6">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchGitHub()}
                placeholder='Search bounties (e.g., "bug bounty", "good first issue")'
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-sm focus:border-[#58a6ff] focus:outline-none"
              />
              <button
                onClick={searchGitHub}
                disabled={isSearching}
                className="bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="space-y-2">
              {searchResults.map((issue) => {
                const repoPath = issue.repository_url.replace("https://api.github.com/repos/", "");
                const alreadyTracked = bounties.some((b) => b.id === issue.id.toString());
                return (
                  <div key={issue.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 hover:border-[#58a6ff]/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <a href={issue.html_url} target="_blank" rel="noopener" className="font-medium text-[#58a6ff] hover:underline">
                          #{issue.number} {issue.title}
                        </a>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#8b949e]">
                          <span>{repoPath}</span>
                          <span>by {issue.user.login}</span>
                          <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                        </div>
                        {issue.labels.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {issue.labels.map((l) => (
                              <span
                                key={l.name}
                                className="text-xs px-1.5 py-0.5 rounded border"
                                style={{
                                  backgroundColor: `#${l.color}22`,
                                  borderColor: `#${l.color}44`,
                                  color: `#${l.color}`,
                                }}
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => !alreadyTracked && importFromSearch(issue)}
                        disabled={alreadyTracked}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          alreadyTracked
                            ? "bg-gray-500/20 text-gray-400 cursor-not-allowed"
                            : "bg-[#238636] hover:bg-[#2ea043] text-white"
                        }`}
                      >
                        {alreadyTracked ? "Tracked" : "Track"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {searchResults.length === 0 && !isSearching && (
              <div className="text-center py-16 text-[#8b949e]">
                <p className="text-4xl mb-4">🔍</p>
                <p>Search GitHub for bounty issues.</p>
                <p className="text-sm mt-2">Try: &quot;bounty&quot;, &quot;good first issue&quot;, or a specific repo name.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363d] mt-12 py-6 text-center text-xs text-[#8b949e]">
        <p>Bounty Tracker v2.0 - Built with Next.js + Tailwind CSS</p>
        <p className="mt-1">Data stored in your browser. No server, no tracking.</p>
      </footer>
    </div>
  );
}

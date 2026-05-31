export interface Bounty {
  id: string;
  repo: string;
  issueNumber: number;
  title: string;
  amount: number;
  status: "open" | "working" | "submitted" | "won" | "expired";
  url: string;
  labels: string[];
  createdAt: string;
  addedAt: string;
  notes?: string;
}

export interface PullRequest {
  id: string;
  repo: string;
  prNumber: number;
  title: string;
  status: "pending" | "review" | "merged" | "closed";
  url: string;
  bountyId?: string;
  createdAt: string;
  addedAt: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  state: string;
  created_at: string;
  repository_url: string;
  user: { login: string };
}

export interface Stats {
  totalBounties: number;
  openBounties: number;
  totalValue: number;
  wonValue: number;
  totalPRs: number;
  mergedPRs: number;
}

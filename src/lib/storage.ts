import { Bounty, PullRequest } from "./types";

const BOUNTIES_KEY = "bounty-tracker-bounties";
const PRS_KEY = "bounty-tracker-prs";

export function getBounties(): Bounty[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(BOUNTIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBounties(bounties: Bounty[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOUNTIES_KEY, JSON.stringify(bounties));
}

export function addBounty(bounty: Bounty): Bounty[] {
  const bounties = getBounties();
  bounties.unshift(bounty);
  saveBounties(bounties);
  return bounties;
}

export function updateBounty(id: string, updates: Partial<Bounty>): Bounty[] {
  const bounties = getBounties();
  const index = bounties.findIndex((b) => b.id === id);
  if (index !== -1) {
    bounties[index] = { ...bounties[index], ...updates };
    saveBounties(bounties);
  }
  return bounties;
}

export function removeBounty(id: string): Bounty[] {
  const bounties = getBounties().filter((b) => b.id !== id);
  saveBounties(bounties);
  return bounties;
}

export function getPRs(): PullRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(PRS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePRs(prs: PullRequest[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRS_KEY, JSON.stringify(prs));
}

export function addPR(pr: PullRequest): PullRequest[] {
  const prs = getPRs();
  prs.unshift(pr);
  savePRs(prs);
  return prs;
}

export function updatePR(id: string, updates: Partial<PullRequest>): PullRequest[] {
  const prs = getPRs();
  const index = prs.findIndex((p) => p.id === id);
  if (index !== -1) {
    prs[index] = { ...prs[index], ...updates };
    savePRs(prs);
  }
  return prs;
}

export function removePR(id: string): PullRequest[] {
  const prs = getPRs().filter((p) => p.id !== id);
  savePRs(prs);
  return prs;
}

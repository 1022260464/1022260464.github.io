import { getCollection } from "astro:content";
import type { Share } from "./shares";

function compareShares(left: Share, right: Share) {
  if (left.order !== right.order) return left.order - right.order;
  return right.date.localeCompare(left.date);
}

export async function getShares(): Promise<Share[]> {
  const entries = (await getCollection("shares", ({ data }) => !data.draft))
    .map((entry) => ({ ...entry.data, id: entry.id }))
    .sort(compareShares);

  const byId = new Map(entries.map((share) => [share.id, share]));
  const roots: Share[] = [];

  for (const share of entries) {
    const parent = share.parent ? byId.get(share.parent) : undefined;

    if (share.parent && parent && parent.id !== share.id) {
      const children = parent.children ?? [];
      children.push(share);
      parent.children = children;
    } else {
      roots.push(share);
    }
  }

  const sortBranch = (branch: Share[]) => {
    branch.sort(compareShares);
    branch.forEach((share) => sortBranch(share.children ?? []));
    return branch;
  };

  return sortBranch(roots);
}

export interface Share {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  href?: string;
  source?: string;
  cover?: string;
  coverAlt?: string;
  external?: boolean;
  order: number;
  lookbook?: boolean;
  lookbookOrder?: number;
  parent?: string;
  children?: Share[];
}

export function getShareDate(date: string) {
  const [year = "", month = "", day = ""] = date.split("-");

  return {
    year,
    month,
    day,
    value: `${year}.${month}.${day}`,
    short: `${month} / ${day}`,
  };
}

export function countShareNodes(nodes: Share[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countShareNodes(node.children ?? []),
    0,
  );
}

export function getShareYears(nodes: Share[]): string[] {
  const years = new Set<string>();

  const visit = (items: Share[]) => {
    items.forEach((item) => {
      years.add(item.date.slice(0, 4));
      visit(item.children ?? []);
    });
  };

  visit(nodes);
  return Array.from(years).sort().reverse();
}

export function getLookbookShares(nodes: Share[]): Share[] {
  return nodes
    .filter((share) => Boolean(share.cover) && share.lookbook !== false)
    .sort((left, right) => {
      const orderDifference =
        (left.lookbookOrder ?? left.order) -
        (right.lookbookOrder ?? right.order);
      if (orderDifference !== 0) return orderDifference;
      return right.date.localeCompare(left.date);
    });
}

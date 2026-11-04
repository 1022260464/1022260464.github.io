function sortItems(items) {
  return [...items].sort((left, right) => {
    if ((left.order ?? 0) !== (right.order ?? 0)) {
      return (left.order ?? 0) - (right.order ?? 0);
    }

    const leftDate = left.pubDate ?? left.date ?? "";
    const rightDate = right.pubDate ?? right.date ?? "";
    return String(rightDate).localeCompare(String(leftDate));
  });
}

export function buildHierarchyOptions(items) {
  const options = [];
  const roots = sortItems(items.filter((item) => !item.parentId));

  const visit = (nodes, parentPath = "", depth = 0) => {
    sortItems(nodes).forEach((item, index) => {
      const segment = String(index + 1).padStart(2, "0");
      const path = depth === 0 ? segment : `${parentPath}.${segment}`;
      options.push({ item, path, depth });
      visit(item.children ?? [], path, depth + 1);
    });
  };

  visit(roots);
  return options;
}

export function printHierarchyOptions(options, label = "可选上级") {
  if (options.length === 0) return;

  console.log("");
  console.log(`${label}：`);

  options.forEach(({ item, path, depth }) => {
    const indent = "   ".repeat(depth);
    console.log(
      `${indent}${path}. ${item.title} [id: ${item.id}]`,
    );
  });
}

export function findHierarchyOption(options, answer) {
  return (
    options.find(
      ({ item, path }) =>
        path === answer ||
        `${path}.` === answer ||
        item.id === answer ||
        item.slug === answer,
    ) ?? null
  );
}

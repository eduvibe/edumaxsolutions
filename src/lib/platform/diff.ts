function tokenizeWords(input: string) {
  return input
    .replace(/\r/g, "")
    .split(/(\s+)/)
    .filter((t) => t.length > 0);
}

type DiffToken =
  | { type: "equal"; text: string }
  | { type: "insert"; text: string }
  | { type: "delete"; text: string };

export function diffWords(oldText: string, newText: string): DiffToken[] {
  const a = tokenizeWords(oldText);
  const b = tokenizeWords(newText);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "equal", text: a[i] });
      i += 1;
      j += 1;
      continue;
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "delete", text: a[i] });
      i += 1;
    } else {
      out.push({ type: "insert", text: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    out.push({ type: "delete", text: a[i] });
    i += 1;
  }
  while (j < m) {
    out.push({ type: "insert", text: b[j] });
    j += 1;
  }

  return out;
}


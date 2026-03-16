export type AikenQuestion = {
  questionText: string;
  options: Partial<Record<"A" | "B" | "C" | "D", string>>;
  correctAnswer: "A" | "B" | "C" | "D";
};

function normalizeLine(line: string) {
  return line.replace(/\r/g, "").trimEnd();
}

function isAnswerLine(line: string) {
  const t = line.trim();
  return /^ANSWER\s*:\s*[A-D]\s*$/i.test(t);
}

function parseAnswer(line: string): "A" | "B" | "C" | "D" | null {
  const m = line.trim().match(/^ANSWER\s*:\s*([A-D])\s*$/i);
  if (!m) return null;
  const v = m[1].toUpperCase();
  return v === "A" || v === "B" || v === "C" || v === "D" ? v : null;
}

function parseOptionLine(line: string): { key: "A" | "B" | "C" | "D"; text: string } | null {
  const trimmed = line.trim();
  const m = trimmed.match(/^([A-D])\s*[\.\)]\s*(.*)$/);
  if (!m) return null;
  const key = m[1] as "A" | "B" | "C" | "D";
  const text = m[2] ?? "";
  return { key, text: text.trim() };
}

export function parseAiken(input: string): { questions: AikenQuestion[]; errors: string[] } {
  const lines = input
    .split("\n")
    .map(normalizeLine)
    .filter((l) => l.trim() !== "");

  const errors: string[] = [];
  const questions: AikenQuestion[] = [];

  let i = 0;
  while (i < lines.length) {
    const qLines: string[] = [];
    const options: Partial<Record<"A" | "B" | "C" | "D", string>> = {};

    while (i < lines.length) {
      const maybe = parseOptionLine(lines[i]);
      const isAnswer = isAnswerLine(lines[i]);
      if (maybe || isAnswer) break;
      qLines.push(lines[i]);
      i += 1;
    }

    if (qLines.length === 0) {
      errors.push(`Missing question text near line ${i + 1}`);
      break;
    }

    while (i < lines.length) {
      const opt = parseOptionLine(lines[i]);
      if (!opt) break;
      if (opt.text) {
        options[opt.key] = opt.text;
      } else {
        options[opt.key] = "";
      }
      i += 1;
    }

    if (i >= lines.length || !isAnswerLine(lines[i])) {
      errors.push(`Missing ANSWER: X line for question "${qLines[0]}"`);
      break;
    }
    const correct = parseAnswer(lines[i]);
    i += 1;
    if (!correct) {
      errors.push(`Invalid ANSWER line for question "${qLines[0]}"`);
      continue;
    }

    const questionText = qLines.join("\n").trim();
    const required = (["A", "B", "C", "D"] as const).filter((k) => typeof options[k] === "string");
    if (required.length < 2) {
      errors.push(`Not enough options for question "${qLines[0]}" (need at least 2)`);
      continue;
    }
    if (!options[correct]) {
      errors.push(`Correct answer ${correct} is missing for question "${qLines[0]}"`);
      continue;
    }

    questions.push({ questionText, options, correctAnswer: correct });
  }

  return { questions, errors };
}


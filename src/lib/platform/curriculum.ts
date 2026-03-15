export const curriculumLessonsByTopicSlug: Record<
  string,
  { title: string; objective?: string | null }[]
> = {
  "mole-concept": [
    { title: "Introduction to the mole", objective: "Understand the mole as an amount of substance." },
    { title: "Avogadro constant and the mole", objective: "Relate particles to moles using Avogadro's constant." },
    { title: "Relative atomic and molecular mass", objective: "Use Ar and Mr in calculations." },
    { title: "Molar mass", objective: "Calculate molar mass and convert between mass and moles." },
    { title: "Empirical and molecular formula", objective: "Determine formulae from composition data." },
    { title: "Mole ratio in equations", objective: "Use balanced equations to relate reactants and products." },
    { title: "Limiting reactant (intro)", objective: "Identify the limiting reactant in simple reactions." },
    { title: "Stoichiometry practice", objective: "Solve mixed mole calculation problems." },
  ],
  "creating-media": [
    { title: "Digital documents", objective: "Create and format documents for clarity and purpose." },
    { title: "Presentations", objective: "Design slides that communicate ideas effectively." },
    { title: "Spreadsheets basics", objective: "Use tables, formulas and charts for data." },
    { title: "Images and media editing", objective: "Edit media responsibly for learning tasks." },
    { title: "Copyright and attribution", objective: "Use Creative Commons and cite sources properly." },
    { title: "Sharing work safely", objective: "Share files online with safety and privacy in mind." },
    { title: "Accessibility in media", objective: "Apply accessibility principles to digital content." },
    { title: "Quiz and review", objective: "Review learning and complete a topic quiz." },
  ],
};


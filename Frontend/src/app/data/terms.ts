export interface Term {
  id: string;
  word: string;
  kana: string;
  shortDesc: string;
  longDesc: string;
  category: "Frontend" | "Backend" | "Infra" | "AI/Data" | "General";
  score: number; // 1: Beginner, 2: Intermediate, 3: Advanced
  relatedTerms: string[];
  externalUrl?: string;
}

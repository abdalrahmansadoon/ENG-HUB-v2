import { Atom, BookOpen, Code2, Cog, FlaskConical, Languages, Lightbulb, Ruler, Scale, Sigma, Variable, Wrench, type LucideIcon } from 'lucide-react';

export const subjectIcons: Record<string, LucideIcon> = {
  sigma: Sigma, atom: Atom, code: Code2, scale: Scale, variable: Variable, bulb: Lightbulb, ruler: Ruler,
  flask: FlaskConical, wrench: Wrench, cog: Cog, languages: Languages, book: BookOpen,
};
export function SubjectIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = subjectIcons[name] ?? BookOpen;
  return <Icon size={size} aria-hidden />;
}

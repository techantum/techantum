import { SEED_CHUNKS, type SeedChunk } from './knowledge-seed';
import type { Skill } from './constants';

const SKILL_CATEGORIES: Record<Skill, string[]> = {
  technical: ['seo', 'accessibility', 'performance', 'forms', 'html', 'responsive', 'security', 'browser'],
  uiux: ['ui', 'ux', 'typography', 'images', 'responsive', 'css', 'techantum'],
  content: ['content', 'seo', 'images', 'techantum'],
};

const ISSUE_CATEGORY: Record<string, string[]> = {
  seo: ['seo'],
  accessibility: ['accessibility', 'forms'],
  performance: ['performance'],
  ui: ['ui', 'typography', 'techantum'],
  ux: ['ux', 'techantum'],
  responsive: ['responsive'],
  content: ['content'],
  forms: ['forms', 'accessibility'],
};

export function categoriesForSkills(skills: Skill[]): string[] {
  return [...new Set(skills.flatMap((skill) => SKILL_CATEGORIES[skill]))];
}

export function categoriesForIssue(category: string): string[] {
  return ISSUE_CATEGORY[category] || [category];
}

export function retrieveChunks(
  chunks: SeedChunk[],
  categories: string[],
  limit = 8
): SeedChunk[] {
  const wanted = new Set(categories.map((item) => item.toLowerCase()));
  return chunks
    .filter((chunk) => wanted.has(chunk.category.toLowerCase()))
    .slice(0, limit);
}

export function retrieveForSkills(skills: Skill[], chunks: SeedChunk[] = SEED_CHUNKS, limit = 8) {
  return retrieveChunks(chunks, categoriesForSkills(skills), limit);
}

export function formatKnowledge(chunks: SeedChunk[]): string {
  return chunks
    .map((chunk) => `[L${chunk.authority_level} ${chunk.source_name}${chunk.version ? ` ${chunk.version}` : ''}${chunk.rule_reference ? ` ${chunk.rule_reference}` : ''}] ${chunk.content}`)
    .join('\n');
}

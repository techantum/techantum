import type { Skill } from './constants';

export type RoutePage = {
  pageType: string;
  technicalCount: number;
  layoutAnomaly: boolean;
  hasScreenshot: boolean;
  contentChars: number;
  formCount: number;
};

export function routeSkills(page: RoutePage, toggles: { uiux: boolean; content: boolean; seo: boolean }): Skill[] {
  const skills = new Set<Skill>();
  const home = page.pageType === 'home';
  if (home || page.technicalCount > 0 || page.formCount > 0) skills.add('technical');
  if (toggles.uiux && (home || page.layoutAnomaly || page.hasScreenshot || ['contact', 'service', 'checkout'].includes(page.pageType))) {
    skills.add('uiux');
  }
  if (toggles.content && (home || page.contentChars > 80 || toggles.seo)) skills.add('content');
  if (!skills.size && page.technicalCount) skills.add('technical');
  return [...skills];
}

export function selectRepresentativePages<T extends {
  url: string;
  pageType: string;
  layoutAnomaly: boolean;
  technicalCount: number;
  templateHash?: string;
}>(pages: T[], maxPages: number): T[] {
  const ranked = [...pages].sort((a, b) => score(b) - score(a));
  const picked: T[] = [];
  const templates = new Set<string>();
  const take = (page: T | undefined) => {
    if (!page || picked.includes(page) || picked.length >= maxPages) return;
    const hash = page.templateHash || page.pageType;
    if (templates.has(hash) && page.pageType === 'other' && !page.layoutAnomaly) return;
    picked.push(page);
    templates.add(hash);
  };
  take(ranked.find((item) => item.pageType === 'home') || ranked[0]);
  take(ranked.find((item) => item.pageType === 'contact'));
  take(ranked.find((item) => item.pageType === 'service' || item.pageType === 'checkout'));
  take([...ranked].sort((a, b) => b.technicalCount - a.technicalCount)[0]);
  for (const page of ranked) take(page);
  return picked.slice(0, maxPages);
}

function score(page: { pageType: string; layoutAnomaly: boolean; technicalCount: number }) {
  let value = page.technicalCount;
  if (page.pageType === 'home') value += 50;
  if (page.pageType === 'contact') value += 20;
  if (page.pageType === 'service' || page.pageType === 'checkout') value += 18;
  if (page.layoutAnomaly) value += 25;
  return value;
}

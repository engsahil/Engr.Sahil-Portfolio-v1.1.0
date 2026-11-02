import type { PortfolioContent, SectionKey, SectionSetting } from './types';

export const SECTION_ORDER: SectionKey[] = [
  'hero', 'doors', 'projects', 'experience', 'education', 'skills', 'achievements', 'contact',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  hero: 'Hero',
  doors: 'Services / doors',
  projects: 'Projects',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  achievements: 'Achievements',
  contact: 'Contact',
};

export const REFERENCE_DESIGN = {
  background: '#f3eee6',
  paper: '#eee7dc',
  charcoal: '#171a19',
  text: '#171817',
  muted: '#a6a39b',
  accent: '#e8bd56',
  doorColors: ['#294d78', '#797185', '#849d8a', '#c96e3c'],
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontWeight: 560,
  headingWeight: 720,
  headingScale: 1,
  bodyScale: 1,
  buttonRadius: 999,
  borderRadius: 18,
  sectionSpacing: 96,
  animation: true,
} as const;

function blankSection(order = 0): SectionSetting {
  return { enabled: true, title: '', description: '', background: '', spacing: 0, order };
}

export function emptyContent(): PortfolioContent {
  return {
    profile: {
      fullName: '', displayName: '', profileImage: '', alternativeImage: '',
      professionalTitle: '', currentRole: '', profession: '', jobPosition: '',
      shortIntroduction: '', biography: '', about: '', location: '', country: '', city: '',
      email: '', phone: '', website: '', availability: '', status: '',
      titles: [], roles: [], specialties: [], descriptions: [],
    },
    hero: {
      heading: '', introduction: '', profession: '', animatedText: [], description: '',
      buttons: [], imageUrl: '', imagePosition: '50% 50%', imageFit: 'cover', imageScale: 1,
      background: '', textColor: '',
    },
    doors: [], experience: [], education: [], projects: [], skills: [], socials: [], achievements: [],
    contact: {
      heading: '', description: '', formVisible: false, showEmail: false, showPhone: false,
      showLocation: false, customFields: '',
    },
    header: {
      enabled: false, logoUrl: '', background: '', textColor: '', spacing: 24,
      sticky: false, mobileMenu: true, showLocalTime: true,
    },
    footer: {
      enabled: false, text: '', background: '', textColor: '', spacing: 40,
      showSocials: false, showContact: false, layout: 'split',
    },
    navigation: { enabled: false, items: [] },
    sections: {
      hero: blankSection(0), doors: blankSection(1), projects: blankSection(2), experience: blankSection(3),
      education: blankSection(4), skills: blankSection(5), achievements: blankSection(6), contact: blankSection(7),
    },
    design: { ...REFERENCE_DESIGN, doorColors: [...REFERENCE_DESIGN.doorColors] },
    seo: { title: '', description: '', openGraphImage: '', favicon: '' },
    media: [],
  };
}

export function mergeContent(input: unknown): PortfolioContent {
  const base = emptyContent();
  if (!input || typeof input !== 'object') return base;
  const source = input as Partial<PortfolioContent>;
  const merged = { ...base, ...source } as PortfolioContent;
  const record = source as Record<string, unknown>;
  merged.profile = { ...base.profile, ...(record.profile as object ?? {}) };
  merged.hero = { ...base.hero, ...(record.hero as object ?? {}) };
  merged.contact = { ...base.contact, ...(record.contact as object ?? {}) };
  merged.header = { ...base.header, ...(record.header as object ?? {}) };
  merged.footer = { ...base.footer, ...(record.footer as object ?? {}) };
  merged.navigation = { ...base.navigation, ...(record.navigation as object ?? {}) };
  merged.design = { ...base.design, ...(record.design as object ?? {}) };
  if (Array.isArray((record.design as { doorColors?: unknown } | undefined)?.doorColors)) {
    merged.design.doorColors = [...((record.design as { doorColors: string[] }).doorColors)];
  }
  merged.seo = { ...base.seo, ...(record.seo as object ?? {}) };
  merged.sections = { ...base.sections, ...(record.sections as object ?? {}) };
  for (const key of SECTION_ORDER) {
    merged.sections[key] = { ...base.sections[key], ...((record.sections as Partial<PortfolioContent['sections']> | undefined)?.[key] ?? {}) };
  }
  merged.doors = Array.isArray(source.doors) ? source.doors : [];
  merged.experience = Array.isArray(source.experience) ? source.experience : [];
  merged.education = Array.isArray(source.education) ? source.education : [];
  merged.projects = Array.isArray(source.projects) ? source.projects : [];
  merged.skills = Array.isArray(source.skills) ? source.skills : [];
  merged.socials = Array.isArray(source.socials) ? source.socials : [];
  merged.achievements = Array.isArray(source.achievements) ? source.achievements : [];
  merged.media = Array.isArray(source.media) ? source.media : [];
  return merged;
}

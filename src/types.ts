export type SectionKey =
  | 'hero'
  | 'doors'
  | 'projects'
  | 'experience'
  | 'education'
  | 'skills'
  | 'achievements'
  | 'contact';

export type SectionSetting = {
  enabled: boolean;
  title: string;
  description: string;
  background: string;
  spacing: number;
  order: number;
};

export type ActionButton = { id: string; label: string; url: string; style: 'solid' | 'outline' | 'text' };

export type Profile = {
  fullName: string;
  displayName: string;
  profileImage: string;
  alternativeImage: string;
  professionalTitle: string;
  currentRole: string;
  profession: string;
  jobPosition: string;
  shortIntroduction: string;
  biography: string;
  about: string;
  location: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  availability: string;
  status: string;
  titles: string[];
  roles: string[];
  specialties: string[];
  descriptions: string[];
};

export type Hero = {
  heading: string;
  introduction: string;
  profession: string;
  animatedText: string[];
  description: string;
  buttons: ActionButton[];
  imageUrl: string;
  imagePosition: string;
  imageFit: 'cover' | 'contain';
  imageScale: number;
  background: string;
  textColor: string;
};

export type Door = {
  id: string;
  title: string;
  label: string;
  color: string;
  image: string;
  description: string;
  details: string;
  link: string;
  enabled: boolean;
  order: number;
};

export type Experience = {
  id: string;
  position: string;
  company: string;
  employmentType: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
  responsibilities: string;
  technologies: string;
  achievements: string;
  order: number;
};

export type Education = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  description: string;
  achievements: string;
  certificates: string;
  order: number;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  category: string;
  thumbnail: string;
  screenshots: string;
  technologies: string;
  liveUrl: string;
  githubUrl: string;
  date: string;
  featured: boolean;
  visible: boolean;
  order: number;
};

export type Skill = {
  id: string;
  name: string;
  category: string;
  proficiencyLabel: string;
  icon: string;
  visible: boolean;
  order: number;
};

export type SocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string;
  visible: boolean;
  order: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  issuer: string;
  date: string;
  certificateImage: string;
  certificateUrl: string;
  order: number;
};

export type NavigationItem = {
  id: string;
  label: string;
  url: string;
  visible: boolean;
  order: number;
};

export type HeaderSettings = {
  enabled: boolean;
  logoUrl: string;
  background: string;
  textColor: string;
  spacing: number;
  sticky: boolean;
  mobileMenu: boolean;
  showLocalTime: boolean;
};

export type FooterSettings = {
  enabled: boolean;
  text: string;
  background: string;
  textColor: string;
  spacing: number;
  showSocials: boolean;
  showContact: boolean;
  layout: 'split' | 'stacked' | 'centered';
};

export type ContactSettings = {
  heading: string;
  description: string;
  formVisible: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  customFields: string;
};

export type DesignSettings = {
  background: string;
  paper: string;
  charcoal: string;
  text: string;
  muted: string;
  accent: string;
  doorColors: string[];
  fontFamily: string;
  fontWeight: number;
  headingWeight: number;
  headingScale: number;
  bodyScale: number;
  buttonRadius: number;
  borderRadius: number;
  sectionSpacing: number;
  animation: boolean;
};

export type SeoSettings = {
  title: string;
  description: string;
  openGraphImage: string;
  favicon: string;
};

export type MediaAsset = {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
};

export type PortfolioContent = {
  profile: Profile;
  hero: Hero;
  doors: Door[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  socials: SocialLink[];
  achievements: Achievement[];
  contact: ContactSettings;
  header: HeaderSettings;
  footer: FooterSettings;
  navigation: { enabled: boolean; items: NavigationItem[] };
  sections: Record<SectionKey, SectionSetting>;
  design: DesignSettings;
  seo: SeoSettings;
  media: MediaAsset[];
};

export type PublishedVersion = {
  id: string;
  content: PortfolioContent;
  createdAt: string;
};

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  message: string;
  fields?: Record<string, string>;
  createdAt: string;
  readAt?: string;
};

export type AdminWorkspace = {
  draft: PortfolioContent;
  published: PortfolioContent;
  versions: PublishedVersion[];
  submissions: ContactSubmission[];
  draftUpdatedAt: string;
  publishedUpdatedAt: string;
};

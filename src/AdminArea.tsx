import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { REFERENCE_DESIGN, SECTION_LABELS, SECTION_ORDER } from './defaults';
import type { AdminWorkspace, Achievement, ActionButton, ContactSubmission, Door, Education, Experience, MediaAsset, NavigationItem, PortfolioContent, Project, SectionKey, Skill, SocialLink } from './types';
import { backendMode, backendSetupNote, changeAdminPassword, getAdminSession, loadAdminWorkspace, publishDraft, publishSelectedContent, saveDraft, signOut, uploadImage } from './store';
import { CollectionEditor, FormField, InfoNote, PanelIntro, SectionCard, StatusPill, StringListField, type FieldDefinition } from './components';
import { PublicSite } from './PublicSite';

const navGroups = [
  { label: 'Workspace', items: [{ id: 'dashboard', label: 'Dashboard', icon: '◫' }, { id: 'profile', label: 'Profile setup', icon: '◉' }, { id: 'hero', label: 'Hero section', icon: '⌖' }] },
  { label: 'Portfolio content', items: [{ id: 'doors', label: 'Services / doors', icon: '▤' }, { id: 'experience', label: 'Experience', icon: '⌁' }, { id: 'education', label: 'Education', icon: '▧' }, { id: 'projects', label: 'Projects', icon: '▣' }, { id: 'skills', label: 'Skills', icon: '✳' }, { id: 'achievements', label: 'Achievements', icon: '◇' }, { id: 'socials', label: 'Social links', icon: '↗' }, { id: 'contact', label: 'Contact', icon: '✉' }] },
  { label: 'Website controls', items: [{ id: 'header', label: 'Header settings', icon: '↔' }, { id: 'footer', label: 'Footer settings', icon: '⌄' }, { id: 'navigation', label: 'Navigation', icon: '☰' }, { id: 'sections', label: 'Section manager', icon: '▦' }, { id: 'design', label: 'Design settings', icon: '◐' }, { id: 'media', label: 'Image library', icon: '▧' }, { id: 'seo', label: 'SEO settings', icon: '⌕' }] },
  { label: 'Publish', items: [{ id: 'publishing', label: 'Publishing', icon: '↑' }, { id: 'settings', label: 'Admin settings', icon: '⚙' }] },
];
const pageCopy: Record<string, { title: string; text: string }> = {
  dashboard: { title: 'Dashboard', text: 'A live overview of your saved portfolio content.' }, profile: { title: 'Profile setup', text: 'Add only the details you want to appear publicly. Every field is optional.' },
  hero: { title: 'Hero section', text: 'Control the first impression, profession text, buttons, and image framing.' }, doors: { title: 'Services / doors', text: 'The colorful arched doors remain the reference-inspired service presentation.' },
  experience: { title: 'Experience', text: 'Manage roles and the long-form timeline shown in your story section.' }, education: { title: 'Education', text: 'Add or remove education records; empty records stay private.' },
  projects: { title: 'Projects', text: 'Control your showcase, preview images, links, visibility, and order.' }, skills: { title: 'Skills', text: 'Add skill names and optional categories. No ratings are generated automatically.' },
  achievements: { title: 'Achievements', text: 'Manage certificates and other achievements.' }, socials: { title: 'Social links', text: 'No social links are shown until you add and enable them.' },
  contact: { title: 'Contact', text: 'Configure public contact details and review messages submitted through the live form.' }, header: { title: 'Header settings', text: 'The header is off by default. Enable it only when configured.' },
  footer: { title: 'Footer settings', text: 'The footer is off by default. Nothing is inserted unless you configure it.' }, navigation: { title: 'Navigation', text: 'Create labels, destinations, and ordering for public navigation.' },
  sections: { title: 'Section manager', text: 'Enable, disable, rename, reorder, and tune public sections.' }, design: { title: 'Design settings', text: 'Reference-derived defaults are preserved. Restore them at any time.' },
  media: { title: 'Image library', text: 'Persistent uploads use Supabase Storage when connected.' }, seo: { title: 'SEO settings', text: 'SEO fields remain empty unless configured.' },
  publishing: { title: 'Publishing', text: 'Draft changes are private. Only publishing updates the public portfolio.' }, settings: { title: 'Admin settings', text: 'Manage the administrator session and password.' },
};
const makeId = () => crypto.randomUUID();
const blankDoor = (i: number, c: PortfolioContent): Door => ({ id: makeId(), title: '', label: '', color: c.design.doorColors[i % Math.max(1, c.design.doorColors.length)] || REFERENCE_DESIGN.doorColors[i % 4], image: '', description: '', details: '', link: '', enabled: true, order: i });
const blankExperience = (i: number): Experience => ({ id: makeId(), position: '', company: '', employmentType: '', location: '', startDate: '', endDate: '', currentlyWorking: false, description: '', responsibilities: '', technologies: '', achievements: '', order: i });
const blankEducation = (i: number): Education => ({ id: makeId(), institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', description: '', achievements: '', certificates: '', order: i });
const blankProject = (i: number): Project => ({ id: makeId(), title: '', description: '', longDescription: '', category: '', thumbnail: '', screenshots: '', technologies: '', liveUrl: '', githubUrl: '', date: '', featured: false, visible: true, order: i });
const blankSkill = (i: number): Skill => ({ id: makeId(), name: '', category: '', proficiencyLabel: '', icon: '', visible: true, order: i });
const blankAchievement = (i: number): Achievement => ({ id: makeId(), title: '', description: '', issuer: '', date: '', certificateImage: '', certificateUrl: '', order: i });
const blankSocial = (i: number): SocialLink => ({ id: makeId(), platform: '', label: '', url: '', icon: '', visible: true, order: i });
const blankNav = (i: number): NavigationItem => ({ id: makeId(), label: '', url: '', visible: true, order: i });

const doorFields: FieldDefinition[] = [
  { key: 'title', label: 'Door title' }, { key: 'label', label: 'Door plaque label' }, { key: 'color', label: 'Door color', type: 'color' },
  { key: 'image', label: 'Door image', type: 'image', help: 'Optional. The reference arched silhouette stays in place.' }, { key: 'description', label: 'Short description', type: 'textarea' },
  { key: 'details', label: 'Door details', type: 'textarea' }, { key: 'link', label: 'Custom link', type: 'url' }, { key: 'enabled', label: 'Show this door', type: 'toggle' },
];
const experienceFields: FieldDefinition[] = [
  { key: 'position', label: 'Position' }, { key: 'company', label: 'Company' }, { key: 'employmentType', label: 'Employment type' }, { key: 'location', label: 'Location' },
  { key: 'startDate', label: 'Start date', type: 'date' }, { key: 'endDate', label: 'End date', type: 'date' }, { key: 'currentlyWorking', label: 'Currently working here', type: 'toggle' },
  { key: 'description', label: 'Description', type: 'textarea' }, { key: 'responsibilities', label: 'Responsibilities', type: 'lines', help: 'One responsibility per line.' },
  { key: 'technologies', label: 'Technologies', type: 'lines' }, { key: 'achievements', label: 'Achievements', type: 'textarea' },
];
const educationFields: FieldDefinition[] = [
  { key: 'institution', label: 'Institution' }, { key: 'degree', label: 'Degree' }, { key: 'fieldOfStudy', label: 'Field of study' },
  { key: 'startDate', label: 'Start date', type: 'date' }, { key: 'endDate', label: 'End date', type: 'date' }, { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'achievements', label: 'Achievements', type: 'textarea' }, { key: 'certificates', label: 'Certificates', type: 'lines' },
];
const projectFields: FieldDefinition[] = [
  { key: 'title', label: 'Project title' }, { key: 'category', label: 'Category' }, { key: 'date', label: 'Project date', type: 'date' },
  { key: 'description', label: 'Short description', type: 'textarea' }, { key: 'longDescription', label: 'Long description', type: 'textarea' },
  { key: 'thumbnail', label: 'Project thumbnail', type: 'image' }, { key: 'screenshots', label: 'Additional screenshots', type: 'lines', help: 'Image URLs, one per line.' },
  { key: 'technologies', label: 'Technologies', type: 'lines' }, { key: 'liveUrl', label: 'Live website URL', type: 'url' }, { key: 'githubUrl', label: 'GitHub URL', type: 'url' },
  { key: 'featured', label: 'Featured project', type: 'toggle' }, { key: 'visible', label: 'Visible on public site', type: 'toggle' },
];
const skillFields: FieldDefinition[] = [
  { key: 'name', label: 'Skill name' }, { key: 'category', label: 'Category' }, { key: 'proficiencyLabel', label: 'Proficiency label', help: 'Optional text only; no percentage is generated.' },
  { key: 'icon', label: 'Icon or symbol' }, { key: 'visible', label: 'Show this skill', type: 'toggle' },
];
const achievementFields: FieldDefinition[] = [
  { key: 'title', label: 'Achievement title' }, { key: 'issuer', label: 'Issuing organization' }, { key: 'date', label: 'Date', type: 'date' },
  { key: 'description', label: 'Description', type: 'textarea' }, { key: 'certificateImage', label: 'Certificate image', type: 'image' }, { key: 'certificateUrl', label: 'Certificate URL', type: 'url' },
];
const socialFields: FieldDefinition[] = [
  { key: 'platform', label: 'Platform name' }, { key: 'label', label: 'Custom label' }, { key: 'url', label: 'URL', type: 'url' }, { key: 'icon', label: 'Icon or symbol' }, { key: 'visible', label: 'Show this link', type: 'toggle' },
];
const navFields: FieldDefinition[] = [
  { key: 'label', label: 'Navigation label' }, { key: 'url', label: 'Destination (URL or #section)', type: 'url' }, { key: 'visible', label: 'Show this link', type: 'toggle' },
];
const buttonFields: FieldDefinition[] = [
  { key: 'label', label: 'Button label' }, { key: 'url', label: 'Button URL', type: 'url' }, { key: 'style', label: 'Button style', type: 'select', options: ['solid', 'outline', 'text'] },
];

function setAtPath(content: PortfolioContent, path: string, value: unknown): PortfolioContent {
  const copy = structuredClone(content) as unknown as Record<string, unknown>;
  const keys = path.split('.'); let target = copy;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[keys[keys.length - 1]] = value;
  return copy as unknown as PortfolioContent;
}
function PanelFrame({ children }: { children: ReactNode }) { return <div className="admin-panel-content">{children}</div>; }

function ProfilePanel({ draft, setDraft, uploadHandler, onSkip }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void; uploadHandler: (file: File) => Promise<string>; onSkip: () => void }) {
  return <PanelFrame><PanelIntro title="Profile setup" eyebrow="YOUR CONTENT, YOUR CALL" action={<button className="button soft" onClick={onSkip}>Skip setup →</button>}>All fields are optional. Nothing is public until you publish it. Empty fields stay empty.</PanelIntro>
    <InfoNote>Your personal information is not prefilled. Add only the details you want on the live site.</InfoNote>
    <SectionCard title="Personal information"><div className="field-grid">
      <FormField label="Full name" value={draft.profile.fullName} onChange={(v) => setDraft('profile.fullName', v)} /><FormField label="Display name" value={draft.profile.displayName} onChange={(v) => setDraft('profile.displayName', v)} />
      <FormField label="Professional title" value={draft.profile.professionalTitle} onChange={(v) => setDraft('profile.professionalTitle', v)} /><FormField label="Current role" value={draft.profile.currentRole} onChange={(v) => setDraft('profile.currentRole', v)} />
      <FormField label="Profession" value={draft.profile.profession} onChange={(v) => setDraft('profile.profession', v)} /><FormField label="Job position" value={draft.profile.jobPosition} onChange={(v) => setDraft('profile.jobPosition', v)} />
      <FormField label="Short introduction" type="textarea" value={draft.profile.shortIntroduction} onChange={(v) => setDraft('profile.shortIntroduction', v)} />
      <FormField label="Complete biography" type="textarea" rows={6} value={draft.profile.biography} onChange={(v) => setDraft('profile.biography', v)} />
      <FormField label="About me" type="textarea" rows={6} value={draft.profile.about} onChange={(v) => setDraft('profile.about', v)} />
      <FormField label="Location" value={draft.profile.location} onChange={(v) => setDraft('profile.location', v)} /><FormField label="City" value={draft.profile.city} onChange={(v) => setDraft('profile.city', v)} />
      <FormField label="Country" value={draft.profile.country} onChange={(v) => setDraft('profile.country', v)} /><FormField label="Email" type="email" value={draft.profile.email} onChange={(v) => setDraft('profile.email', v)} />
      <FormField label="Phone" value={draft.profile.phone} onChange={(v) => setDraft('profile.phone', v)} /><FormField label="Website" type="url" value={draft.profile.website} onChange={(v) => setDraft('profile.website', v)} />
      <FormField label="Professional availability" value={draft.profile.availability} onChange={(v) => setDraft('profile.availability', v)} /><FormField label="Profile status" value={draft.profile.status} onChange={(v) => setDraft('profile.status', v)} />
    </div></SectionCard>
    <SectionCard title="Professional identity"><div className="field-grid">
      <StringListField label="Multiple professional titles" value={draft.profile.titles} onChange={(v) => setDraft('profile.titles', v)} />
      <StringListField label="Multiple roles" value={draft.profile.roles} onChange={(v) => setDraft('profile.roles', v)} />
      <StringListField label="Specialties" value={draft.profile.specialties} onChange={(v) => setDraft('profile.specialties', v)} />
      <StringListField label="Additional descriptions" value={draft.profile.descriptions} onChange={(v) => setDraft('profile.descriptions', v)} />
    </div></SectionCard>
    <SectionCard title="Profile image controls"><div className="field-grid">
      <FormField label="Profile picture" type="image" value={draft.profile.profileImage} onChange={(v) => setDraft('profile.profileImage', v)} uploadHandler={uploadHandler} help="Uses object-fit without stretching." />
      <FormField label="Alternative profile picture" type="image" value={draft.profile.alternativeImage} onChange={(v) => setDraft('profile.alternativeImage', v)} uploadHandler={uploadHandler} />
      <FormField label="Hero image override" type="image" value={draft.hero.imageUrl} onChange={(v) => setDraft('hero.imageUrl', v)} uploadHandler={uploadHandler} />
      <FormField label="Image scale" type="number" value={draft.hero.imageScale} onChange={(v) => setDraft('hero.imageScale', v)} help="1 is the natural fit. Use 0.5 to 2." />
      <FormField label="Image position" value={draft.hero.imagePosition} onChange={(v) => setDraft('hero.imagePosition', v)} help="CSS object-position, for example 50% 30%." />
      <FormField label="Object fit" type="select" options={['cover', 'contain']} value={draft.hero.imageFit} onChange={(v) => setDraft('hero.imageFit', v)} />
    </div></SectionCard>
    <SectionCard title="Image preview controls"><div className="image-preview-grid">
      {draft.profile.profileImage ? <div><span>Desktop</span><div className="profile-preview desktop"><img src={draft.profile.profileImage} alt="Desktop crop preview" style={{ objectPosition: draft.hero.imagePosition, objectFit: draft.hero.imageFit, transform: `scale(${draft.hero.imageScale || 1})` }} /></div></div> : <div className="preview-empty">Desktop preview appears after a picture is added.</div>}
      {draft.profile.profileImage ? <div><span>Mobile</span><div className="profile-preview mobile"><img src={draft.profile.profileImage} alt="Mobile crop preview" style={{ objectPosition: draft.hero.imagePosition, objectFit: draft.hero.imageFit, transform: `scale(${draft.hero.imageScale || 1})` }} /></div></div> : <div className="preview-empty">No profile image configured.</div>}
    </div></SectionCard>
  </PanelFrame>;
}

function HeroPanel({ draft, setDraft, uploadHandler }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void; uploadHandler: (file: File) => Promise<string> }) {
  return <PanelFrame><PanelIntro title="Hero section">If no hero content is configured, the public hero remains hidden.</PanelIntro>
    <SectionCard title="Copy"><div className="field-grid">
      <FormField label="Main heading" value={draft.hero.heading} onChange={(v) => setDraft('hero.heading', v)} /><FormField label="Introduction" value={draft.hero.introduction} onChange={(v) => setDraft('hero.introduction', v)} />
      <FormField label="Profession text" value={draft.hero.profession} onChange={(v) => setDraft('hero.profession', v)} /><FormField label="Description" type="textarea" value={draft.hero.description} onChange={(v) => setDraft('hero.description', v)} />
      <StringListField label="Animated text entries" value={draft.hero.animatedText} onChange={(v) => setDraft('hero.animatedText', v)} help="Optional; one phrase per line." />
    </div></SectionCard>
    <CollectionEditor<ActionButton & { [key: string]: unknown }> title="Hero buttons" description="Buttons are hidden unless both label and destination are set." items={draft.hero.buttons as (ActionButton & { [key: string]: unknown })[]} fields={buttonFields} createItem={() => ({ id: makeId(), label: '', url: '', style: 'solid' }) as ActionButton & { [key: string]: unknown }} onChange={(items) => setDraft('hero.buttons', items)} />
    <SectionCard title="Appearance"><div className="field-grid">
      <FormField label="Hero image" type="image" value={draft.hero.imageUrl} onChange={(v) => setDraft('hero.imageUrl', v)} uploadHandler={uploadHandler} />
      <FormField label="Image position" value={draft.hero.imagePosition} onChange={(v) => setDraft('hero.imagePosition', v)} />
      <FormField label="Image scale" type="number" value={draft.hero.imageScale} onChange={(v) => setDraft('hero.imageScale', v)} />
      <FormField label="Object fit" type="select" options={['cover', 'contain']} value={draft.hero.imageFit} onChange={(v) => setDraft('hero.imageFit', v)} />
      <FormField label="Background override" type="color" value={draft.hero.background} onChange={(v) => setDraft('hero.background', v)} />
      <FormField label="Text color override" type="color" value={draft.hero.textColor} onChange={(v) => setDraft('hero.textColor', v)} />
    </div></SectionCard>
  </PanelFrame>;
}

function CollectionPanel<T extends { id: string; [key: string]: unknown }>({ title, description, items, fields, createItem, update, uploadHandler }: { title: string; description: string; items: T[]; fields: FieldDefinition[]; createItem: (index: number) => T; update: (items: T[]) => void; uploadHandler: (file: File) => Promise<string> }) {
  return <PanelFrame><PanelIntro title={title}>{description}</PanelIntro><CollectionEditor title={title} description={description} items={items} fields={fields} createItem={createItem} onChange={update} uploadHandler={uploadHandler} /></PanelFrame>;
}

function ContactPanel({ draft, setDraft, submissions }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void; submissions: ContactSubmission[] }) {
  return <PanelFrame><PanelIntro title="Contact">Configure public contact details and review messages. Form submissions are private to the admin area.</PanelIntro>
    <SectionCard title="Public contact settings"><div className="field-grid">
      <FormField label="Contact heading" value={draft.contact.heading} onChange={(v) => setDraft('contact.heading', v)} />
      <FormField label="Contact description" type="textarea" value={draft.contact.description} onChange={(v) => setDraft('contact.description', v)} />
      <FormField label="Show contact form" type="toggle" value={draft.contact.formVisible} onChange={(v) => setDraft('contact.formVisible', v)} />
      <FormField label="Show email" type="toggle" value={draft.contact.showEmail} onChange={(v) => setDraft('contact.showEmail', v)} />
      <FormField label="Show phone" type="toggle" value={draft.contact.showPhone} onChange={(v) => setDraft('contact.showPhone', v)} />
      <FormField label="Show location" type="toggle" value={draft.contact.showLocation} onChange={(v) => setDraft('contact.showLocation', v)} />
      <FormField label="Additional form field labels" type="lines" value={draft.contact.customFields} onChange={(v) => setDraft('contact.customFields', v)} help="One label per line." />
    </div></SectionCard>
    <SectionCard title={`Submissions (${submissions.length})`}>
      {submissions.length ? <div className="submission-list">{submissions.map((s) => <article key={s.id} className="submission-card"><div className="submission-head"><div><strong>{s.name}</strong><a href={`mailto:${s.email}`}>{s.email}</a></div><time>{new Date(s.createdAt).toLocaleString()}</time></div><p>{s.message}</p>{s.fields && Object.keys(s.fields).length ? <dl className="submission-extra">{Object.entries(s.fields).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}</article>)}</div> : <div className="empty-state-card"><span className="empty-mark">✉</span><h3>No submissions</h3><p>Messages sent through a configured public form will appear here.</p></div>}
    </SectionCard>
  </PanelFrame>;
}

function HeaderPanel({ draft, setDraft, uploadHandler }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void; uploadHandler: (file: File) => Promise<string> }) {
  return <PanelFrame><PanelIntro title="Header settings">The compact reference navigation has no automatic branding. Header is off by default.</PanelIntro>
    <SectionCard title="Header"><div className="field-grid">
      <FormField label="Enable header" type="toggle" value={draft.header.enabled} onChange={(v) => setDraft('header.enabled', v)} />
      <FormField label="Logo image" type="image" value={draft.header.logoUrl} onChange={(v) => setDraft('header.logoUrl', v)} uploadHandler={uploadHandler} />
      <FormField label="Header background" type="color" value={draft.header.background} onChange={(v) => setDraft('header.background', v)} />
      <FormField label="Header text color" type="color" value={draft.header.textColor} onChange={(v) => setDraft('header.textColor', v)} />
      <FormField label="Header spacing" type="number" value={draft.header.spacing} onChange={(v) => setDraft('header.spacing', v)} />
      <FormField label="Sticky behavior" type="toggle" value={draft.header.sticky} onChange={(v) => setDraft('header.sticky', v)} />
      <FormField label="Mobile navigation control" type="toggle" value={draft.header.mobileMenu} onChange={(v) => setDraft('header.mobileMenu', v)} />
      <FormField label="Show local time and date" type="toggle" value={draft.header.showLocalTime} onChange={(v) => setDraft('header.showLocalTime', v)} help="Uses the visitor's local time." />
    </div></SectionCard><InfoNote>Navigation items come from the Navigation module and appear only when both navigation and header are enabled.</InfoNote>
  </PanelFrame>;
}
function FooterPanel({ draft, setDraft }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void }) {
  return <PanelFrame><PanelIntro title="Footer settings">No copyright, developer credit, or brand text is added automatically.</PanelIntro>
    <SectionCard title="Footer"><div className="field-grid">
      <FormField label="Enable footer" type="toggle" value={draft.footer.enabled} onChange={(v) => setDraft('footer.enabled', v)} />
      <FormField label="Custom footer text" type="textarea" value={draft.footer.text} onChange={(v) => setDraft('footer.text', v)} />
      <FormField label="Footer background" type="color" value={draft.footer.background} onChange={(v) => setDraft('footer.background', v)} />
      <FormField label="Footer text color" type="color" value={draft.footer.textColor} onChange={(v) => setDraft('footer.textColor', v)} />
      <FormField label="Footer spacing" type="number" value={draft.footer.spacing} onChange={(v) => setDraft('footer.spacing', v)} />
      <FormField label="Show social links" type="toggle" value={draft.footer.showSocials} onChange={(v) => setDraft('footer.showSocials', v)} />
      <FormField label="Show contact details" type="toggle" value={draft.footer.showContact} onChange={(v) => setDraft('footer.showContact', v)} />
      <FormField label="Footer layout" type="select" options={['split', 'stacked', 'centered']} value={draft.footer.layout} onChange={(v) => setDraft('footer.layout', v)} />
    </div></SectionCard>
  </PanelFrame>;
}
function NavigationPanel({ draft, setDraft }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void }) {
  return <PanelFrame><PanelIntro title="Navigation">Links are not shown unless navigation and the header are enabled.</PanelIntro>
    <SectionCard title="Navigation controls"><FormField label="Enable navigation" type="toggle" value={draft.navigation.enabled} onChange={(v) => setDraft('navigation.enabled', v)} /></SectionCard>
    <CollectionEditor<NavigationItem & { [key: string]: unknown }> title="Navigation links" description="Use #section anchors or a full external URL." items={draft.navigation.items as (NavigationItem & { [key: string]: unknown })[]} fields={navFields} createItem={blankNav} onChange={(items) => setDraft('navigation.items', items)} />
  </PanelFrame>;
}
function SectionsPanel({ draft, setDraft }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void }) {
  const move = (key: SectionKey, dir: -1 | 1) => {
    const order = [...SECTION_ORDER].sort((a, b) => draft.sections[a].order - draft.sections[b].order); const i = order.indexOf(key); const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]]; order.forEach((section, index) => setDraft(`sections.${section}.order`, index));
  };
  const order = [...SECTION_ORDER].sort((a, b) => draft.sections[a].order - draft.sections[b].order);
  return <PanelFrame><PanelIntro title="Section manager">A section with no configured content stays hidden, even if enabled.</PanelIntro>
    <div className="section-manager-list">{order.map((key, index) => <SectionCard key={key} title={SECTION_LABELS[key]} action={<div className="section-order-actions"><button className="mini-button" disabled={!index} onClick={() => move(key, -1)} aria-label="Move up">↑</button><button className="mini-button" disabled={index === order.length - 1} onClick={() => move(key, 1)} aria-label="Move down">↓</button></div>}>
      <div className="field-grid"><FormField label="Enable section" type="toggle" value={draft.sections[key].enabled} onChange={(v) => setDraft(`sections.${key}.enabled`, v)} />
        <FormField label="Section title" value={draft.sections[key].title} onChange={(v) => setDraft(`sections.${key}.title`, v)} />
        <FormField label="Section description" type="textarea" value={draft.sections[key].description} onChange={(v) => setDraft(`sections.${key}.description`, v)} />
        <FormField label="Background override" value={draft.sections[key].background} onChange={(v) => setDraft(`sections.${key}.background`, v)} placeholder="Blank uses reference color" />
        <FormField label="Section spacing (px)" type="number" value={draft.sections[key].spacing} onChange={(v) => setDraft(`sections.${key}.spacing`, v)} />
      </div></SectionCard>)}</div>
  </PanelFrame>;
}
function DesignPanel({ draft, setDraft, restore }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void; restore: () => void }) {
  return <PanelFrame><PanelIntro title="Design settings" eyebrow="REFERENCE-LOCKED DEFAULTS" action={<button className="button soft" onClick={restore}>Restore reference defaults</button>}>The cream / charcoal palette, arched service doors, and restrained typography are preserved as the starting point.</PanelIntro>
    <SectionCard title="Color palette"><div className="field-grid">
      <FormField label="Primary background" type="color" value={draft.design.background} onChange={(v) => setDraft('design.background', v)} /><FormField label="Secondary paper" type="color" value={draft.design.paper} onChange={(v) => setDraft('design.paper', v)} />
      <FormField label="Charcoal sections" type="color" value={draft.design.charcoal} onChange={(v) => setDraft('design.charcoal', v)} /><FormField label="Text color" type="color" value={draft.design.text} onChange={(v) => setDraft('design.text', v)} />
      <FormField label="Muted text" type="color" value={draft.design.muted} onChange={(v) => setDraft('design.muted', v)} /><FormField label="Accent color" type="color" value={draft.design.accent} onChange={(v) => setDraft('design.accent', v)} />
      <StringListField label="Door colors" value={draft.design.doorColors} onChange={(v) => setDraft('design.doorColors', v)} help="Colors apply in order; defaults mirror the reference doors." />
    </div><div className="swatch-row">{draft.design.doorColors.map((color, i) => <span key={`${i}-${color}`} style={{ background: color }} title={color} />)}</div></SectionCard>
    <SectionCard title="Typography and proportions"><div className="field-grid">
      <FormField label="Font family" value={draft.design.fontFamily} onChange={(v) => setDraft('design.fontFamily', v)} /><FormField label="Body weight" type="number" value={draft.design.fontWeight} onChange={(v) => setDraft('design.fontWeight', v)} />
      <FormField label="Heading weight" type="number" value={draft.design.headingWeight} onChange={(v) => setDraft('design.headingWeight', v)} />
      <FormField label="Heading scale" type="number" value={draft.design.headingScale} onChange={(v) => setDraft('design.headingScale', v)} /><FormField label="Body scale" type="number" value={draft.design.bodyScale} onChange={(v) => setDraft('design.bodyScale', v)} />
      <FormField label="Button radius (px)" type="number" value={draft.design.buttonRadius} onChange={(v) => setDraft('design.buttonRadius', v)} /><FormField label="Border radius (px)" type="number" value={draft.design.borderRadius} onChange={(v) => setDraft('design.borderRadius', v)} />
      <FormField label="Section spacing (px)" type="number" value={draft.design.sectionSpacing} onChange={(v) => setDraft('design.sectionSpacing', v)} /><FormField label="Lightweight animations" type="toggle" value={draft.design.animation} onChange={(v) => setDraft('design.animation', v)} />
    </div></SectionCard>
  </PanelFrame>;
}
function MediaPanel({ draft, setDraft }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void }) {
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [copied, setCopied] = useState('');
  const upload = async (file: File) => uploadImage(file);
  const add = () => { if (!url.trim()) return; setDraft('media', [{ id: makeId(), name: name.trim(), url: url.trim(), type: 'image', uploadedAt: new Date().toISOString() }, ...draft.media]); setName(''); setUrl(''); };
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); setCopied('Copied'); window.setTimeout(() => setCopied(''), 1400); } catch { setCopied('Copy URL'); } };
  return <PanelFrame><PanelIntro title="Image library">Reusable images for your profile, doors, projects, certificates, logo, and metadata.</PanelIntro>
    <InfoNote tone={backendMode === 'local-preview' ? 'warning' : 'plain'}>{backendSetupNote()}</InfoNote>
    <SectionCard title="Add an image"><div className="field-grid"><FormField label="Upload image" type="image" value={url} onChange={(v) => setUrl(String(v))} uploadHandler={upload} help="Upload an image or paste an image URL below." /><FormField label="Asset name" value={name} onChange={(v) => setName(String(v))} /><FormField label="Image URL" type="url" value={url} onChange={(v) => setUrl(String(v))} /></div><button className="button dark" onClick={add} disabled={!url.trim()}>Add to library</button></SectionCard>
    <SectionCard title={`Stored images (${draft.media.length})`}>{draft.media.length ? <div className="media-grid">{draft.media.map((asset) => <article className="media-card" key={asset.id}><div className="media-thumb"><img src={asset.url} alt={asset.name} loading="lazy" /></div><div className="media-card-info"><strong>{asset.name || 'Image asset'}</strong><span>{asset.type}</span><div><button className="mini-button" onClick={() => void copy(asset.url)}>{copied || 'Copy URL'}</button><button className="mini-button danger" onClick={() => setDraft('media', draft.media.filter((item) => item.id !== asset.id))}>Remove</button></div></div></article>)}</div> : <div className="empty-state-card"><span className="empty-mark">▧</span><h3>No images added</h3><p>Uploaded media appears here for easy reuse.</p></div>}</SectionCard>
  </PanelFrame>;
}
function SeoPanel({ draft, setDraft, uploadHandler }: { draft: PortfolioContent; setDraft: (path: string, value: unknown) => void; uploadHandler: (file: File) => Promise<string> }) {
  return <PanelFrame><PanelIntro title="SEO settings">These fields remain empty unless you configure them.</PanelIntro>
    <SectionCard title="Search and sharing"><div className="field-grid"><FormField label="SEO title" value={draft.seo.title} onChange={(v) => setDraft('seo.title', v)} />
      <FormField label="Meta description" type="textarea" value={draft.seo.description} onChange={(v) => setDraft('seo.description', v)} />
      <FormField label="Open Graph image" type="image" value={draft.seo.openGraphImage} onChange={(v) => setDraft('seo.openGraphImage', v)} uploadHandler={uploadHandler} />
      <FormField label="Favicon" type="image" value={draft.seo.favicon} onChange={(v) => setDraft('seo.favicon', v)} uploadHandler={uploadHandler} /></div></SectionCard>
  </PanelFrame>;
}
function formatTimestamp(value: string) { return value ? new Date(value).toLocaleString() : 'Not saved yet'; }
const publishGroups = [
  { id: 'profile', label: 'Profile & hero' }, { id: 'doors', label: 'Services / doors' }, { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience & story' }, { id: 'education', label: 'Education' }, { id: 'skills', label: 'Skills' },
  { id: 'achievements', label: 'Achievements' }, { id: 'contact', label: 'Contact & social links' }, { id: 'site', label: 'Site settings & section layout' },
];
function PublishingPanel({ workspace, save, publish, publishSelected, restoreVersion, dirty, saving, publishing, message }: { workspace: AdminWorkspace; save: () => void; publish: () => void; publishSelected: (groups: string[]) => void; restoreVersion: (content: PortfolioContent) => void; dirty: boolean; saving: boolean; publishing: boolean; message: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (key: string) => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  return <PanelFrame><PanelIntro title="Drafts and publishing">Saving keeps changes private. Publishing updates the live portfolio and active visitors.</PanelIntro>
    {message ? <InfoNote tone={message.toLowerCase().includes('error') ? 'warning' : 'success'}>{message}</InfoNote> : null}
    <div className="publish-cards"><article><span className="eyebrow">PRIVATE DRAFT</span><strong>{dirty ? 'Unsaved changes' : 'Saved draft'}</strong><p>Last saved: {formatTimestamp(workspace.draftUpdatedAt)}</p><button className="button soft" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button></article>
      <article><span className="eyebrow">PUBLIC VERSION</span><strong>{workspace.publishedUpdatedAt ? 'Published' : 'Not published'}</strong><p>Last published: {formatTimestamp(workspace.publishedUpdatedAt)}</p><button className="button dark" onClick={publish} disabled={publishing}>{publishing ? 'Publishing…' : 'Publish all draft changes'}</button></article></div>
    <SectionCard title="Publish selected content"><p className="muted-copy">Choose content groups to apply from the draft. Unselected public groups stay unchanged; the draft remains separately saved.</p>
      <div className="publish-select-grid">{publishGroups.map((group) => <label key={group.id}><input type="checkbox" checked={selected.includes(group.id)} onChange={() => toggle(group.id)} /><span>{group.label}</span></label>)}</div>
      <button className="button dark" onClick={() => publishSelected(selected)} disabled={publishing || !selected.length}>{publishing ? 'Publishing…' : `Publish ${selected.length ? `${selected.length} selected` : 'selected'} group${selected.length === 1 ? '' : 's'}`}</button>
    </SectionCard>
    <SectionCard title={`Published history (${workspace.versions.length})`}>{workspace.versions.length ? <div className="version-list">{workspace.versions.map((version, index) => <article className="version-item" key={version.id}><div><span className="version-index">{String(index + 1).padStart(2, '0')}</span><div><strong>{new Date(version.createdAt).toLocaleString()}</strong><span>{version.id}</span></div></div><button className="mini-button" onClick={() => restoreVersion(version.content)}>Restore to draft</button></article>)}</div> : <div className="empty-state-card"><span className="empty-mark">↺</span><h3>No earlier versions</h3><p>When you publish, previous public content is kept here.</p></div>}</SectionCard>
  </PanelFrame>;
}
function AdminSettingsPanel({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const change = async () => { setMessage(''); if (password.length < 12) { setMessage('Use a password with at least 12 characters.'); return; } if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setBusy(true); try { await changeAdminPassword(password); setMessage('Password updated.'); setPassword(''); setConfirm(''); } catch (e) { setMessage(e instanceof Error ? e.message : 'Password could not be updated.'); } finally { setBusy(false); } };
  return <PanelFrame><PanelIntro title="Admin settings">Supabase Authentication stores passwords when connected.</PanelIntro>
    {backendMode === 'local-preview' ? <InfoNote tone="warning">Local preview credentials are browser-local and are not production authentication.</InfoNote> : null}
    <SectionCard title="Administrator account"><div className="admin-account-row"><div><span>Signed in as</span><strong>{email || 'Administrator'}</strong></div><StatusPill tone="positive">Authenticated</StatusPill></div>
      <div className="field-grid password-grid"><FormField label="New password" type="password" value={password} onChange={(v) => setPassword(String(v))} help="At least 12 characters." /><FormField label="Confirm new password" type="password" value={confirm} onChange={(v) => setConfirm(String(v))} /></div>
      {message ? <InfoNote tone={message === 'Password updated.' ? 'success' : 'warning'}>{message}</InfoNote> : null}<button className="button dark" onClick={() => void change()} disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
    </SectionCard><SectionCard title="Session"><p className="muted-copy">Sign out to end this admin session in this browser.</p><button className="button danger-button" onClick={onLogout}>Sign out</button></SectionCard>
  </PanelFrame>;
}
function countConfigured(c: PortfolioContent) { return [c.profile.fullName, c.profile.displayName, c.profile.profession, c.profile.professionalTitle, c.profile.shortIntroduction, c.profile.biography, c.profile.email, c.profile.location, c.profile.profileImage, c.hero.heading, c.hero.introduction, c.hero.description].filter((value) => Boolean(value.trim())).length; }
function DashboardPanel({ workspace, onGo }: { workspace: AdminWorkspace; onGo: (id: string) => void }) {
  const d = workspace.draft; const filled = countConfigured(d);
  const counts = [
    { label: 'Projects', value: d.projects.filter((x) => x.title.trim()).length, target: 'projects', mark: '▣' },
    { label: 'Services / doors', value: d.doors.filter((x) => x.title.trim()).length, target: 'doors', mark: '▤' },
    { label: 'Experience entries', value: d.experience.filter((x) => x.position.trim() || x.company.trim()).length, target: 'experience', mark: '⌁' },
    { label: 'Skills', value: d.skills.filter((x) => x.name.trim()).length, target: 'skills', mark: '✳' },
  ];
  return <PanelFrame><PanelIntro title="Dashboard" eyebrow="PORTFOLIO WORKSPACE">A quiet workspace for shaping the reference-inspired site. Counts reflect saved content.</PanelIntro>
    <div className="dashboard-status-row"><div className="dashboard-status"><div><span>PUBLIC STATUS</span><strong>{workspace.publishedUpdatedAt ? 'Published content is live' : 'No published content'}</strong></div><StatusPill tone={workspace.publishedUpdatedAt ? 'positive' : 'warning'}>{workspace.publishedUpdatedAt ? 'Live' : 'Unpublished'}</StatusPill></div>
      <div className="profile-completion"><div className="completion-head"><span>Profile completion</span><strong>{filled} / 12</strong></div><div className="completion-track"><span style={{ width: `${filled / 12 * 100}%` }} /></div><button className="text-action" onClick={() => onGo('profile')}>Continue profile setup ↗</button></div></div>
    <div className="dashboard-counts">{counts.map((card) => <button className="count-card" key={card.label} onClick={() => onGo(card.target)}><span className="count-mark">{card.mark}</span><strong>{card.value}</strong><span>{card.label}</span><i>↗</i></button>)}</div>
    <div className="dashboard-grid"><SectionCard title="Content overview"><div className="overview-list">{[
      ['Profile fields', filled], ['Education records', d.education.filter((x) => x.institution.trim() || x.degree.trim()).length], ['Achievements', d.achievements.filter((x) => x.title.trim()).length],
      ['Social links', d.socials.filter((x) => x.url.trim()).length], ['Contact submissions', workspace.submissions.length], ['Image assets', d.media.length],
    ].map(([label, count]) => <div key={label as string}><span>{label}</span><strong>{count}</strong></div>)}</div></SectionCard>
      <SectionCard title="Recent changes"><div className="recent-change-list"><div><span className="change-indicator draft" /><div><strong>Draft</strong><span>{formatTimestamp(workspace.draftUpdatedAt)}</span></div></div><div><span className="change-indicator published" /><div><strong>Published</strong><span>{formatTimestamp(workspace.publishedUpdatedAt)}</span></div></div><div><span className="change-indicator" /><div><strong>Recent version</strong><span>{workspace.versions[0] ? formatTimestamp(workspace.versions[0].createdAt) : 'No versions yet'}</span></div></div></div></SectionCard></div>
    <InfoNote>No sample projects, profile details, credentials, or social links have been added. Empty sections stay hidden publicly.</InfoNote>
  </PanelFrame>;
}

function composeSelectedPublication(published: PortfolioContent, draft: PortfolioContent, groups: string[]): PortfolioContent {
  const next = structuredClone(published);
  if (groups.includes('profile')) { next.profile = structuredClone(draft.profile); next.hero = structuredClone(draft.hero); next.sections.hero = structuredClone(draft.sections.hero); }
  if (groups.includes('doors')) { next.doors = structuredClone(draft.doors); next.sections.doors = structuredClone(draft.sections.doors); }
  if (groups.includes('projects')) { next.projects = structuredClone(draft.projects); next.sections.projects = structuredClone(draft.sections.projects); }
  if (groups.includes('experience')) { next.experience = structuredClone(draft.experience); next.sections.experience = structuredClone(draft.sections.experience); }
  if (groups.includes('education')) { next.education = structuredClone(draft.education); next.sections.education = structuredClone(draft.sections.education); }
  if (groups.includes('skills')) { next.skills = structuredClone(draft.skills); next.sections.skills = structuredClone(draft.sections.skills); }
  if (groups.includes('achievements')) { next.achievements = structuredClone(draft.achievements); next.sections.achievements = structuredClone(draft.sections.achievements); }
  if (groups.includes('contact')) {
    next.contact = structuredClone(draft.contact); next.socials = structuredClone(draft.socials); next.sections.contact = structuredClone(draft.sections.contact);
    for (const key of ['email', 'phone', 'location', 'city', 'country'] as const) next.profile[key] = draft.profile[key];
  }
  if (groups.includes('site')) { next.header = structuredClone(draft.header); next.footer = structuredClone(draft.footer); next.navigation = structuredClone(draft.navigation); next.design = structuredClone(draft.design); next.seo = structuredClone(draft.seo); next.media = structuredClone(draft.media); next.sections = structuredClone(draft.sections); }
  return next;
}

export function AdminArea({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const [sessionEmail, setSessionEmail] = useState(''); const [authState, setAuthState] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [workspace, setWorkspace] = useState<AdminWorkspace | null>(null); const [loadError, setLoadError] = useState('');
  const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false); const [publishing, setPublishing] = useState(false); const [actionMessage, setActionMessage] = useState('');
  useEffect(() => { let live = true; void getAdminSession().then((session) => { if (!live) return; if (!session.authenticated) { setAuthState('missing'); navigate('/admin/login'); return; } setSessionEmail(session.email); setAuthState('ready'); }).catch(() => { if (live) { setAuthState('missing'); navigate('/admin/login'); } }); return () => { live = false; }; }, [navigate]);
  useEffect(() => { if (authState !== 'ready') return; let live = true; void loadAdminWorkspace().then((result) => { if (live) { setWorkspace(result); setLoadError(''); } }).catch((error) => { if (live) setLoadError(error instanceof Error ? error.message : 'Could not load admin content.'); }); return () => { live = false; }; }, [authState]);
  const updateDraft = (update: (current: PortfolioContent) => PortfolioContent) => { setWorkspace((current) => current ? { ...current, draft: update(current.draft) } : current); setDirty(true); setActionMessage(''); };
  const setDraft = (name: string, value: unknown) => updateDraft((current) => setAtPath(current, name, value));
  const uploadHandler = async (file: File) => { const url = await uploadImage(file); const asset: MediaAsset = { id: makeId(), name: file.name, url, type: file.type || 'image', uploadedAt: new Date().toISOString() }; updateDraft((current) => ({ ...current, media: [asset, ...current.media] })); return url; };
  const save = async () => { if (!workspace) return; setSaving(true); setActionMessage(''); try { const time = await saveDraft(workspace.draft); setWorkspace((current) => current ? { ...current, draftUpdatedAt: time } : current); setDirty(false); setActionMessage('Draft saved. It is still private.'); } catch (e) { setActionMessage(`Error: ${e instanceof Error ? e.message : 'Draft could not be saved.'}`); } finally { setSaving(false); } };
  const publish = async () => { if (!workspace) return; setPublishing(true); setActionMessage(''); try { await publishDraft(workspace.draft); setWorkspace(await loadAdminWorkspace()); setDirty(false); setActionMessage('Published. The public version has been updated.'); } catch (e) { setActionMessage(`Error: ${e instanceof Error ? e.message : 'Publishing failed.'}`); } finally { setPublishing(false); } };
  const publishSelected = async (groups: string[]) => { if (!workspace || !groups.length) return; setPublishing(true); setActionMessage(''); try { await saveDraft(workspace.draft); const next = composeSelectedPublication(workspace.published, workspace.draft, groups); await publishSelectedContent(next); setWorkspace(await loadAdminWorkspace()); setDirty(false); setActionMessage('Draft saved; selected content groups published.'); } catch (e) { setActionMessage(`Error: ${e instanceof Error ? e.message : 'Selected publishing failed.'}`); } finally { setPublishing(false); } };
  const logout = async () => { await signOut(); navigate('/admin/login'); };
  const currentKey = path.split('?')[0].replace(/\/$/, '').split('/').pop() || 'dashboard'; const panelKey = currentKey === 'admin' ? 'dashboard' : currentKey;
  const panelInfo = pageCopy[panelKey] || pageCopy.dashboard;
  if (authState === 'checking' || authState === 'missing') return <div className="admin-loading"><span className="loading-mark" /><p>Checking administrator session…</p></div>;
  if (loadError) return <div className="admin-load-error"><div className="auth-mark">◎</div><h1>Admin data could not load</h1><p>{loadError}</p><button className="button dark" onClick={() => window.location.reload()}>Try again</button><button className="text-action" onClick={() => void logout()}>Sign out</button></div>;
  if (!workspace) return <div className="admin-loading"><span className="loading-mark" /><p>Loading portfolio workspace…</p></div>;
  if (panelKey === 'preview') return <PublicSite content={workspace.draft} draftMode onBack={() => navigate('/admin')} onPublish={() => void publish()} />;
  const go = (id: string) => navigate(`/admin/${id === 'dashboard' ? '' : id}`);
  const updateCollection = <T extends { id: string }>(key: keyof PortfolioContent, items: T[]) => setDraft(String(key), items);
  let panel: ReactNode;
  switch (panelKey) {
    case 'profile': panel = <ProfilePanel draft={workspace.draft} setDraft={setDraft} uploadHandler={uploadHandler} onSkip={() => navigate('/admin')} />; break;
    case 'hero': panel = <HeroPanel draft={workspace.draft} setDraft={setDraft} uploadHandler={uploadHandler} />; break;
    case 'doors': panel = <CollectionPanel<Door & { [key: string]: unknown }> title="Services / doors" description="Enabled, titled doors render in the reference-inspired arched-door section." items={workspace.draft.doors as (Door & { [key: string]: unknown })[]} fields={doorFields} createItem={(i) => blankDoor(i, workspace.draft) as Door & { [key: string]: unknown }} update={(items) => updateCollection('doors', items)} uploadHandler={uploadHandler} />; break;
    case 'experience': panel = <CollectionPanel<Experience & { [key: string]: unknown }> title="Experience" description="Entries appear as a dark two-column timeline; empty records stay hidden." items={workspace.draft.experience as (Experience & { [key: string]: unknown })[]} fields={experienceFields} createItem={(i) => blankExperience(i) as Experience & { [key: string]: unknown }} update={(items) => updateCollection('experience', items)} uploadHandler={uploadHandler} />; break;
    case 'education': panel = <CollectionPanel<Education & { [key: string]: unknown }> title="Education" description="Add unlimited records; only configured entries are shown." items={workspace.draft.education as (Education & { [key: string]: unknown })[]} fields={educationFields} createItem={(i) => blankEducation(i) as Education & { [key: string]: unknown }} update={(items) => updateCollection('education', items)} uploadHandler={uploadHandler} />; break;
    case 'projects': panel = <CollectionPanel<Project & { [key: string]: unknown }> title="Projects" description="Featured work is prioritized visually; use list controls to reorder." items={workspace.draft.projects as (Project & { [key: string]: unknown })[]} fields={projectFields} createItem={(i) => blankProject(i) as Project & { [key: string]: unknown }} update={(items) => updateCollection('projects', items)} uploadHandler={uploadHandler} />; break;
    case 'skills': panel = <CollectionPanel<Skill & { [key: string]: unknown }> title="Skills" description="Skill labels and categories only. No rating values are inserted." items={workspace.draft.skills as (Skill & { [key: string]: unknown })[]} fields={skillFields} createItem={(i) => blankSkill(i) as Skill & { [key: string]: unknown }} update={(items) => updateCollection('skills', items)} uploadHandler={uploadHandler} />; break;
    case 'achievements': panel = <CollectionPanel<Achievement & { [key: string]: unknown }> title="Achievements" description="Certificate images, dates, and URLs are optional." items={workspace.draft.achievements as (Achievement & { [key: string]: unknown })[]} fields={achievementFields} createItem={(i) => blankAchievement(i) as Achievement & { [key: string]: unknown }} update={(items) => updateCollection('achievements', items)} uploadHandler={uploadHandler} />; break;
    case 'socials': panel = <CollectionPanel<SocialLink & { [key: string]: unknown }> title="Social links" description="A social account is shown only when it has a URL and is enabled." items={workspace.draft.socials as (SocialLink & { [key: string]: unknown })[]} fields={socialFields} createItem={(i) => blankSocial(i) as SocialLink & { [key: string]: unknown }} update={(items) => updateCollection('socials', items)} uploadHandler={uploadHandler} />; break;
    case 'contact': panel = <ContactPanel draft={workspace.draft} setDraft={setDraft} submissions={workspace.submissions} />; break;
    case 'header': panel = <HeaderPanel draft={workspace.draft} setDraft={setDraft} uploadHandler={uploadHandler} />; break;
    case 'footer': panel = <FooterPanel draft={workspace.draft} setDraft={setDraft} />; break;
    case 'navigation': panel = <NavigationPanel draft={workspace.draft} setDraft={setDraft} />; break;
    case 'sections': panel = <SectionsPanel draft={workspace.draft} setDraft={setDraft} />; break;
    case 'design': panel = <DesignPanel draft={workspace.draft} setDraft={setDraft} restore={() => setDraft('design', { ...REFERENCE_DESIGN, doorColors: [...REFERENCE_DESIGN.doorColors] })} />; break;
    case 'media': panel = <MediaPanel draft={workspace.draft} setDraft={setDraft} />; break;
    case 'seo': panel = <SeoPanel draft={workspace.draft} setDraft={setDraft} uploadHandler={uploadHandler} />; break;
    case 'publishing': panel = <PublishingPanel workspace={workspace} save={() => void save()} publish={() => void publish()} publishSelected={(groups) => void publishSelected(groups)} restoreVersion={(value) => { updateDraft(() => structuredClone(value)); setActionMessage('Previous published content restored to draft. Save or publish when ready.'); }} dirty={dirty} saving={saving} publishing={publishing} message={actionMessage} />; break;
    case 'settings': panel = <AdminSettingsPanel email={sessionEmail} onLogout={() => void logout()} />; break;
    default: panel = <DashboardPanel workspace={workspace} onGo={go} />;
  }
  return <div className="admin-app">
    <aside className="admin-sidebar"><button className="admin-wordmark" onClick={() => go('dashboard')} aria-label="Admin dashboard"><span className="admin-emblem">◌</span><span>PORTFOLIO<br /><small>ADMIN WORKSPACE</small></span></button>
      <div className="sidebar-scroll">{navGroups.map((group) => <div className="sidebar-group" key={group.label}><span className="sidebar-group-label">{group.label}</span>{group.items.map((item) => <button key={item.id} onClick={() => go(item.id)} className={`sidebar-link ${panelKey === item.id ? 'active' : ''}`}><span className="sidebar-icon">{item.icon}</span><span>{item.label}</span></button>)}</div>)}</div>
      <div className="sidebar-bottom"><span className="admin-avatar">{sessionEmail.slice(0, 1).toUpperCase() || 'A'}</span><div><strong>Administrator</strong><span>{sessionEmail || 'Signed in'}</span></div><button title="Sign out" aria-label="Sign out" onClick={() => void logout()}>↗</button></div>
    </aside>
    <main className="admin-main"><header className="admin-topbar"><div className="crumb"><span>PORTFOLIO</span><i>/</i><strong>{panelInfo.title}</strong></div><div className="topbar-actions"><StatusPill tone={dirty ? 'warning' : 'positive'}>{dirty ? 'Unsaved changes' : 'Draft saved'}</StatusPill><button className="button soft small" onClick={() => navigate('/admin/preview')}>Preview draft</button><button className="button soft small" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button><button className="button dark small" onClick={() => void publish()} disabled={publishing}>{publishing ? 'Publishing…' : 'Publish'}</button></div></header>
      {backendMode === 'local-preview' ? <div className="local-mode-banner"><span>LOCAL PREVIEW MODE</span>{backendSetupNote()}</div> : null}
      {actionMessage && panelKey !== 'publishing' ? <div className={`action-banner ${actionMessage.startsWith('Error:') ? 'error' : ''}`}>{actionMessage}<button onClick={() => setActionMessage('')} aria-label="Dismiss">×</button></div> : null}
      <div className="admin-content-scroll">{panelKey === 'dashboard' ? <DashboardPanel workspace={workspace} onGo={go} /> : panel}</div>
    </main>
  </div>;
}

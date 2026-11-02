import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { SECTION_ORDER } from './defaults';
import type { Door, PortfolioContent, Project, SectionKey } from './types';
import { submitContact } from './store';

const nonEmpty = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const visibleProjects = (items: Project[]) => items.filter((item) => item.visible !== false && nonEmpty(item.title));
const visibleDoors = (items: Door[]) => items.filter((item) => item.enabled !== false && nonEmpty(item.title));
const parseLines = (value: string) => value.split(/\n|,/).map((line) => line.trim()).filter(Boolean);
const validHref = (value: string) => /^(https?:|mailto:|tel:|#|\/)/i.test(value) ? value : value ? `https://${value}` : '#';

function hasHeroContent(content: PortfolioContent): boolean {
  const p = content.profile;
  const h = content.hero;
  return [h.heading, h.introduction, h.profession, h.description, p.fullName, p.displayName, p.professionalTitle,
    p.currentRole, p.profession, p.jobPosition, p.shortIntroduction, p.availability, p.status, h.imageUrl, p.profileImage, p.alternativeImage]
    .some(nonEmpty) || (h.animatedText ?? []).some(nonEmpty) || (p.titles ?? []).some(nonEmpty) || (p.roles ?? []).some(nonEmpty) || (p.specialties ?? []).some(nonEmpty) || (p.descriptions ?? []).some(nonEmpty) || (h.buttons ?? []).some((b) => nonEmpty(b.label)) || content.socials.some((item) => item.visible && nonEmpty(item.url));
}

function isSectionConfigured(key: SectionKey, content: PortfolioContent): boolean {
  const setting = content.sections[key];
  if (!setting?.enabled) return false;
  if (nonEmpty(setting.title) || nonEmpty(setting.description)) return true;
  switch (key) {
    case 'hero': return hasHeroContent(content);
    case 'doors': return visibleDoors(content.doors).length > 0;
    case 'projects': return visibleProjects(content.projects).length > 0;
    case 'experience': return content.experience.some((item) => [item.position, item.company, item.description].some(nonEmpty)) || nonEmpty(content.profile.about) || nonEmpty(content.profile.biography);
    case 'education': return content.education.some((item) => [item.institution, item.degree, item.fieldOfStudy, item.description].some(nonEmpty));
    case 'skills': return content.skills.some((item) => item.visible !== false && nonEmpty(item.name));
    case 'achievements': return content.achievements.some((item) => [item.title, item.description, item.issuer].some(nonEmpty));
    case 'contact': return [content.contact.heading, content.contact.description].some(nonEmpty)
      || (content.contact.formVisible && (content.contact.customFields !== undefined))
      || (content.contact.showEmail && nonEmpty(content.profile.email))
      || (content.contact.showPhone && nonEmpty(content.profile.phone))
      || (content.contact.showLocation && [content.profile.location, content.profile.city, content.profile.country].some(nonEmpty));
  }
}

function getDesignVars(content: PortfolioContent): CSSProperties {
  const d = content.design;
  return {
    '--paper': d.background || '#f3eee6',
    '--paper-2': d.paper || '#eee7dc',
    '--ink': d.text || '#171817',
    '--charcoal': d.charcoal || '#171a19',
    '--muted': d.muted || '#a6a39b',
    '--accent': d.accent || '#e8bd56',
    '--font': d.fontFamily || 'system-ui, sans-serif',
    '--font-weight': d.fontWeight || 560,
    '--heading-weight': d.headingWeight || 720,
    '--heading-scale': d.headingScale || 1,
    '--body-scale': d.bodyScale || 1,
    '--button-radius': `${d.buttonRadius ?? 999}px`,
    '--border-radius': `${d.borderRadius ?? 18}px`,
    '--section-space': `${d.sectionSpacing ?? 96}px`,
    '--door-blue': d.doorColors?.[0] || '#294d78',
    '--door-lilac': d.doorColors?.[1] || '#797185',
    '--door-green': d.doorColors?.[2] || '#849d8a',
    '--door-orange': d.doorColors?.[3] || '#c96e3c',
  } as CSSProperties;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  if (!nonEmpty(title) && !nonEmpty(description)) return null;
  return <div className="public-section-heading"><div>{nonEmpty(title) ? <h2>{title}</h2> : null}{nonEmpty(description) ? <p>{description}</p> : null}</div><span className="heading-rule" /></div>;
}

function LinkButton({ label, url, styleType = 'solid' }: { label: string; url: string; styleType?: string }) {
  if (!nonEmpty(label) || !nonEmpty(url)) return null;
  return <a className={`public-button ${styleType}`} href={validHref(url)} target={/^https?:/i.test(url) ? '_blank' : undefined} rel="noreferrer">{label}<span aria-hidden="true">↗</span></a>;
}

function SiteHeader({ content }: { content: PortfolioContent }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const links = content.navigation.enabled ? content.navigation.items.filter((item) => item.visible && nonEmpty(item.label) && nonEmpty(item.url)).sort((a, b) => a.order - b.order) : [];
  const hasLogo = nonEmpty(content.header.logoUrl);
  useEffect(() => {
    if (!content.header.showLocalTime) return;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [content.header.showLocalTime]);
  if (!content.header.enabled || (!links.length && !hasLogo)) return null;
  return <header className={`public-header ${content.header.sticky ? 'sticky' : ''}`} style={{ background: content.header.background || undefined, color: content.header.textColor || undefined, paddingBlock: content.header.spacing }}>
    {hasLogo ? <a className="public-logo" href="#top" aria-label="Home"><img src={content.header.logoUrl} alt="" /></a> : <span className="public-logo-space" />}
    <nav className={menuOpen ? 'open' : ''} aria-label="Main navigation">
      {links.map((item) => <a href={validHref(item.url)} key={item.id} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
    </nav>
    {content.header.showLocalTime ? <div className="header-time"><time>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now)}</time><span>{new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).format(now)}</span></div> : null}
    {content.header.mobileMenu ? <button className="nav-toggle" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen((open) => !open)}><span className="nav-mobile-mark" aria-hidden="true"><i /><i /></span></button> : null}
  </header>;
}

function HeroSection({ content }: { content: PortfolioContent }) {
  const { profile, hero } = content;
  const roles = (hero.animatedText?.length ? hero.animatedText : profile.titles?.length ? profile.titles : profile.roles ?? [])
    .map((item) => item.trim()).filter(Boolean);
  const baseRole = hero.profession || profile.profession || profile.professionalTitle || profile.jobPosition || profile.currentRole;
  const [roleIndex, setRoleIndex] = useState(0);
  useEffect(() => {
    if (roles.length < 2 || !content.design.animation) return;
    const timer = window.setInterval(() => setRoleIndex((index) => (index + 1) % roles.length), 2800);
    return () => window.clearInterval(timer);
  }, [roles.length, content.design.animation]);
  const displayName = profile.displayName || profile.fullName;
  const image = hero.imageUrl || profile.profileImage || profile.alternativeImage;
  const introduction = hero.introduction || profile.shortIntroduction;
  const extraDescription = hero.description || profile.biography || profile.about || profile.descriptions.join('\n');
  const role = roles.length ? roles[roleIndex % roles.length] : baseRole;
  const section = content.sections.hero;
  const bg = section.background || hero.background || undefined;
  const imageStyle: CSSProperties = { objectPosition: hero.imagePosition || '50% 50%', objectFit: hero.imageFit || 'cover', transform: `scale(${Math.max(0.5, Math.min(2, hero.imageScale || 1))})` };
  return <section id="hero" className="hero-section public-section" style={{ background: bg, color: hero.textColor || undefined, paddingBlock: section.spacing || undefined }}>
    <div className="hero-main">
      <div className="hero-copy">
        {nonEmpty(profile.availability) || nonEmpty(profile.status) ? <div className="availability-line"><span className="availability-dot" />{profile.availability || profile.status}</div> : null}
        {nonEmpty(hero.heading) ? <h1>{hero.heading}</h1> : displayName ? <h1>Hi, I&apos;m <span>{displayName}</span></h1> : null}
        {nonEmpty(introduction) ? <p className="hero-introduction">{introduction}</p> : null}
        {nonEmpty(role) ? <div className="profession-card" aria-live="polite"><span className="profession-card-mark">✳</span><span>{role}</span><span className="profession-card-index">{roles.length > 1 ? `${String((roleIndex % roles.length) + 1).padStart(2, '0')} / ${String(roles.length).padStart(2, '0')}` : ''}</span></div> : null}
        {nonEmpty(extraDescription) ? <p className="hero-description">{extraDescription}</p> : null}
        {profile.specialties.some(nonEmpty) ? <div className="tag-row hero-specialties">{profile.specialties.filter(nonEmpty).map((item) => <span className="tag" key={item}>{item}</span>)}</div> : null}
        <div className="hero-actions">{hero.buttons.filter((button) => nonEmpty(button.label) && nonEmpty(button.url)).map((button) => <LinkButton key={button.id} label={button.label} url={button.url} styleType={button.style} />)}</div>
        {content.socials.some((item) => item.visible && nonEmpty(item.url) && (nonEmpty(item.label) || nonEmpty(item.platform))) ? <div className="social-row">{content.socials.filter((item) => item.visible && nonEmpty(item.url)).map((item) => <a key={item.id} href={validHref(item.url)} target="_blank" rel="noreferrer">{nonEmpty(item.icon) ? <span className="social-icon">{item.icon}</span> : null}{item.label || item.platform}</a>)}</div> : null}
      </div>
      {nonEmpty(image) ? <div className="hero-image-frame"><img src={image} alt={profile.displayName || profile.fullName || ''} style={imageStyle} fetchPriority="high" /></div> : null}
    </div>
    {(nonEmpty(profile.location) || nonEmpty(profile.city) || nonEmpty(profile.country) || nonEmpty(profile.website) || nonEmpty(profile.currentRole)) ? <div className="hero-meta-row">
      <span>{[profile.city, profile.country, profile.location].filter(nonEmpty).join(', ')}</span>
      {nonEmpty(profile.currentRole) ? <span>{profile.currentRole}</span> : null}
      {nonEmpty(profile.website) ? <a href={validHref(profile.website)} target="_blank" rel="noreferrer">{profile.website.replace(/^https?:\/\//, '')}</a> : null}
    </div> : null}
  </section>;
}

function DoorDetail({ door, close }: { door: Door; close: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return <div className="door-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="door-detail" role="dialog" aria-modal="true" aria-label={door.title}>
      <button className="door-close" onClick={close} aria-label="Close">×</button>
      <div className="door-detail-door" style={{ '--door-color': door.color || '#294d78' } as CSSProperties}>{door.image ? <img src={door.image} alt="" /> : null}{nonEmpty(door.label || door.title) ? <span>{door.label || door.title}</span> : null}</div>
      <div className="door-detail-copy"><div className="eyebrow">{door.label || door.title}</div>{nonEmpty(door.title) ? <h2>{door.title}</h2> : null}{nonEmpty(door.description) ? <p>{door.description}</p> : null}{nonEmpty(door.details) ? <div className="door-detail-text">{door.details}</div> : null}{nonEmpty(door.link) ? <LinkButton label="Explore" url={door.link} /> : null}</div>
    </div>
  </div>;
}

function DoorsSection({ content }: { content: PortfolioContent }) {
  const [selected, setSelected] = useState<Door | null>(null);
  const doors = visibleDoors(content.doors).sort((a, b) => a.order - b.order);
  const setting = content.sections.doors;
  return <section id="doors" className="doors-section public-section dark-section" style={{ background: setting.background || undefined, paddingBlock: setting.spacing || undefined }}>
    <div className="section-inner"><SectionHeading title={setting.title} description={setting.description} />
      <div className="doors-headline"><span className="eyebrow">{nonEmpty(content.profile.profession) ? content.profile.profession : ''}</span>{nonEmpty(setting.title) ? null : null}</div>
      <div className="doors-display">{doors.map((door, index) => <button className="door-card" key={door.id} onClick={() => setSelected(door)} style={{ '--door-color': door.color || content.design.doorColors[index % content.design.doorColors.length] || '#294d78', '--door-index': index } as CSSProperties}>
        <span className="door-arch"><span className="door-ribs" />{door.image ? <img src={door.image} alt="" loading="lazy" /> : null}<span className="door-plaque">{door.label || door.title}</span><span className="door-handle" /></span>
        <span className="door-card-title">{door.title}</span>
        {nonEmpty(door.description) ? <span className="door-card-description">{door.description}</span> : null}
      </button>)}</div>
    </div>{selected ? <DoorDetail door={selected} close={() => setSelected(null)} /> : null}
  </section>;
}

function ProjectsSection({ content }: { content: PortfolioContent }) {
  const projects = visibleProjects(content.projects).sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
  const setting = content.sections.projects;
  return <section id="projects" className="projects-section public-section dark-section" style={{ background: setting.background || undefined, paddingBlock: setting.spacing || undefined }}>
    <div className="section-inner"><SectionHeading title={setting.title} description={setting.description} />
      <div className="project-list">{projects.map((project, index) => {
        const imageList = [project.thumbnail, ...parseLines(project.screenshots)].filter(Boolean);
        const image = imageList[0];
        return <article className={`project-row ${index % 2 ? 'reverse' : ''}`} key={project.id}>
          <div className="project-copy">
            <div className="project-kicker">{project.category || project.date || (project.featured ? 'FEATURED' : '')}</div>
            <h3>{project.title}</h3>
            {nonEmpty(project.description) ? <p>{project.description}</p> : null}
            {nonEmpty(project.longDescription) ? <p className="project-long-description">{project.longDescription}</p> : null}
            {nonEmpty(project.technologies) ? <div className="tag-row">{parseLines(project.technologies).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div> : null}
            <div className="project-links">{nonEmpty(project.liveUrl) ? <LinkButton label="View project" url={project.liveUrl} styleType="solid" /> : null}{nonEmpty(project.githubUrl) ? <LinkButton label="Source" url={project.githubUrl} styleType="outline" /> : null}</div>
          </div>
          <div className="project-screen-wrap">
            <div className="project-screen"><div className="screen-top"><i /><i /><i /><span>{project.category}</span></div>{image ? <img src={image} alt={`${project.title} preview`} loading="lazy" /> : <div className="screen-type"><span>{project.title}</span></div>}</div>
            <div className="screen-stand" />
            {imageList.length > 1 ? <div className="project-thumbnails">{imageList.slice(1).map((src, photoIndex) => <img src={src} alt={`${project.title} preview ${photoIndex + 2}`} loading="lazy" key={`${src}-${photoIndex}`} />)}</div> : null}
          </div>
        </article>;
      })}</div>
    </div>
  </section>;
}

function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value.length === 4 ? `${value}-01-01T00:00:00` : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: value.length === 4 ? undefined : 'short', year: 'numeric' }).format(date);
}

function StorySection({ content }: { content: PortfolioContent }) {
  const setting = content.sections.experience;
  const records = content.experience.filter((item) => [item.position, item.company, item.description].some(nonEmpty)).sort((a, b) => a.order - b.order);
  const firstYear = records.map((item) => item.startDate.match(/\d{4}/)?.[0]).filter(Boolean).sort()[0] || '';
  return <section id="experience" className="story-section public-section dark-section" style={{ background: setting.background || undefined, paddingBlock: setting.spacing || undefined }}>
    <div className="section-inner"><SectionHeading title={setting.title} description={setting.description} />
      {content.profile.about || content.profile.biography ? <div className="story-intro">{content.profile.about || content.profile.biography}</div> : null}
      <div className="story-layout"><div className="story-left">
        <span className="eyebrow">{content.profile.currentRole || ''}</span>
        {firstYear ? <span className="story-year">{firstYear}</span> : null}
        {records.length && records[0].startDate ? <span className="story-date">{formatDate(records[0].startDate)}{records[0].currentlyWorking ? ' — Present' : records[0].endDate ? ` — ${formatDate(records[0].endDate)}` : ''}</span> : null}
      </div><div className="timeline-list">{records.map((item) => <article className="timeline-item" key={item.id}>
        <span className="timeline-node" />
        <div className="timeline-date">{[formatDate(item.startDate), item.currentlyWorking ? 'Present' : formatDate(item.endDate)].filter(Boolean).join(' — ')}</div>
        {nonEmpty(item.position) ? <h3>{item.position}</h3> : null}
        {nonEmpty(item.company) || nonEmpty(item.employmentType) || nonEmpty(item.location) ? <div className="timeline-meta">{[item.company, item.employmentType, item.location].filter(Boolean).join(' · ')}</div> : null}
        {nonEmpty(item.description) ? <p>{item.description}</p> : null}
        {nonEmpty(item.responsibilities) ? <ul>{parseLines(item.responsibilities).map((line, index) => <li key={`${item.id}-r-${index}`}>{line}</li>)}</ul> : null}
        {nonEmpty(item.technologies) ? <div className="tag-row">{parseLines(item.technologies).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div> : null}
        {nonEmpty(item.achievements) ? <p className="timeline-extra">{item.achievements}</p> : null}
      </article>)}</div></div>
    </div>
  </section>;
}

function EducationSection({ content }: { content: PortfolioContent }) {
  const setting = content.sections.education;
  const records = content.education.filter((item) => [item.institution, item.degree, item.fieldOfStudy, item.description].some(nonEmpty)).sort((a, b) => a.order - b.order);
  return <section id="education" className="education-section public-section" style={{ background: setting.background || undefined, paddingBlock: setting.spacing || undefined }}><div className="section-inner">
    <SectionHeading title={setting.title} description={setting.description} />
    <div className="education-grid">{records.map((item) => <article className="education-card" key={item.id}>
      <div className="education-date">{[formatDate(item.startDate), formatDate(item.endDate)].filter(Boolean).join(' — ')}</div>
      {nonEmpty(item.institution) ? <h3>{item.institution}</h3> : null}
      {nonEmpty(item.degree) || nonEmpty(item.fieldOfStudy) ? <div className="education-degree">{[item.degree, item.fieldOfStudy].filter(Boolean).join(' · ')}</div> : null}
      {nonEmpty(item.description) ? <p>{item.description}</p> : null}
      {nonEmpty(item.achievements) ? <p>{item.achievements}</p> : null}
      {nonEmpty(item.certificates) ? <div className="tag-row">{parseLines(item.certificates).map((certificate) => <span className="tag" key={certificate}>{certificate}</span>)}</div> : null}
    </article>)}</div>
  </div></section>;
}

function SkillsSection({ content }: { content: PortfolioContent }) {
  const setting = content.sections.skills;
  const skills = content.skills.filter((skill) => skill.visible !== false && nonEmpty(skill.name)).sort((a, b) => a.order - b.order);
  const categories = useMemo(() => Array.from(new Set(skills.map((skill) => skill.category.trim()).filter(Boolean))), [skills]);
  return <section id="skills" className="skills-section public-section dark-section" style={{ background: setting.background || undefined, paddingBlock: setting.spacing || undefined }}><div className="section-inner">
    <SectionHeading title={setting.title} description={setting.description} />
    {categories.length ? categories.map((category) => <div className="skill-group" key={category}><h3>{category}</h3><div className="skill-cloud">{skills.filter((skill) => skill.category === category).map((skill) => <span className="skill-pill" key={skill.id}>{skill.icon ? <span className="skill-icon">{skill.icon}</span> : null}{skill.name}{nonEmpty(skill.proficiencyLabel) ? <small>{skill.proficiencyLabel}</small> : null}</span>)}</div></div>) : <div className="skill-cloud">{skills.map((skill) => <span className="skill-pill" key={skill.id}>{skill.icon ? <span className="skill-icon">{skill.icon}</span> : null}{skill.name}{nonEmpty(skill.proficiencyLabel) ? <small>{skill.proficiencyLabel}</small> : null}</span>)}</div>}
  </div></section>;
}

function AchievementsSection({ content }: { content: PortfolioContent }) {
  const setting = content.sections.achievements;
  const records = content.achievements.filter((item) => [item.title, item.description, item.issuer].some(nonEmpty)).sort((a, b) => a.order - b.order);
  return <section id="achievements" className="achievements-section public-section" style={{ background: setting.background || undefined, paddingBlock: setting.spacing || undefined }}><div className="section-inner">
    <SectionHeading title={setting.title} description={setting.description} />
    <div className="achievement-list">{records.map((item) => <article className="achievement-card" key={item.id}>
      {item.certificateImage ? <img src={item.certificateImage} alt="Certificate" loading="lazy" /> : null}
      <div><div className="achievement-meta">{[item.issuer, formatDate(item.date)].filter(Boolean).join(' · ')}</div>{nonEmpty(item.title) ? <h3>{item.title}</h3> : null}{nonEmpty(item.description) ? <p>{item.description}</p> : null}{nonEmpty(item.certificateUrl) ? <a className="inline-link" href={validHref(item.certificateUrl)} target="_blank" rel="noreferrer">View certificate ↗</a> : null}</div>
    </article>)}</div>
  </div></section>;
}

function ContactSection({ content }: { content: PortfolioContent }) {
  const setting = content.sections.contact;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const customFields = parseLines(content.contact.customFields);
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true); setStatus('');
    try {
      await submitContact({ name, email, message, fields: customValues });
      setStatus('Message sent.'); setName(''); setEmail(''); setMessage(''); setCustomValues({});
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to send.');
    } finally { setSending(false); }
  };
  const location = [content.profile.city, content.profile.country, content.profile.location].filter(nonEmpty).join(', ');
  return <section id="contact" className="contact-section public-section dark-section" style={{ background: setting.background || undefined, paddingBlock: setting.spacing || undefined }}><div className="section-inner">
    <SectionHeading title={setting.title || content.contact.heading} description={setting.description || content.contact.description} />
    <div className="contact-grid">
      <div className="contact-details">
        {content.contact.showEmail && nonEmpty(content.profile.email) ? <a href={`mailto:${content.profile.email}`}><span>Email</span>{content.profile.email}<i>↗</i></a> : null}
        {content.contact.showPhone && nonEmpty(content.profile.phone) ? <a href={`tel:${content.profile.phone}`}><span>Phone</span>{content.profile.phone}<i>↗</i></a> : null}
        {content.contact.showLocation && nonEmpty(location) ? <div><span>Location</span>{location}</div> : null}
        {content.socials.filter((item) => item.visible && nonEmpty(item.url)).map((item) => <a href={validHref(item.url)} key={item.id} target="_blank" rel="noreferrer"><span>{item.icon || item.platform}</span>{item.label || item.url}<i>↗</i></a>)}
      </div>
      {content.contact.formVisible ? <form className="contact-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="contact-field-row"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoComplete="name" /></label><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" /></label></div>
        {customFields.map((field) => <label key={field}>{field}<input type="text" maxLength={1000} value={customValues[field] || ''} onChange={(event) => setCustomValues((current) => ({ ...current, [field]: event.target.value }))} /></label>)}
        <label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={5} maxLength={6000} /></label>
        <button type="submit" className="public-button solid" disabled={sending}>{sending ? 'Sending…' : 'Send message'}<span>↗</span></button>
        {status ? <div className="form-status" role="status">{status}</div> : null}
      </form> : null}
    </div>
  </div></section>;
}

function PublicFooter({ content }: { content: PortfolioContent }) {
  const links = content.navigation.items.filter((item) => item.visible && nonEmpty(item.label) && nonEmpty(item.url)).sort((a, b) => a.order - b.order);
  const socials = content.socials.filter((item) => item.visible && nonEmpty(item.url));
  const hasElements = nonEmpty(content.footer.text) || (content.footer.showSocials && socials.length > 0) || (content.footer.showContact && (nonEmpty(content.profile.email) || nonEmpty(content.profile.phone))) || links.length > 0;
  if (!content.footer.enabled || !hasElements) return null;
  return <footer className={`public-footer layout-${content.footer.layout || 'split'}`} style={{ background: content.footer.background || undefined, color: content.footer.textColor || undefined, paddingBlock: content.footer.spacing }}>
    {nonEmpty(content.footer.text) ? <p>{content.footer.text}</p> : null}
    {content.footer.showContact ? <div className="footer-contact">{nonEmpty(content.profile.email) ? <a href={`mailto:${content.profile.email}`}>{content.profile.email}</a> : null}{nonEmpty(content.profile.phone) ? <a href={`tel:${content.profile.phone}`}>{content.profile.phone}</a> : null}</div> : null}
    {content.footer.showSocials ? <div className="footer-socials">{socials.map((item) => <a href={validHref(item.url)} key={item.id} target="_blank" rel="noreferrer">{nonEmpty(item.icon) ? <span className="social-icon">{item.icon}</span> : null}{item.label || item.platform}</a>)}</div> : null}
    {links.length ? <nav>{links.map((item) => <a href={validHref(item.url)} key={item.id}>{item.label}</a>)}</nav> : null}
  </footer>;
}

export function PublicSite({ content, draftMode = false, onBack, onPublish }: { content: PortfolioContent; draftMode?: boolean; onBack?: () => void; onPublish?: () => void }) {
  const activeSections = SECTION_ORDER.filter((key) => isSectionConfigured(key, content)).sort((a, b) => content.sections[a].order - content.sections[b].order);
  const vars = getDesignVars(content);
  useEffect(() => {
    const { title, description, openGraphImage, favicon } = content.seo;
    document.title = title || '';
    let descriptionTag = document.querySelector('meta[name="description"]');
    if (description) {
      if (!descriptionTag) { descriptionTag = document.createElement('meta'); descriptionTag.setAttribute('name', 'description'); document.head.appendChild(descriptionTag); }
      descriptionTag.setAttribute('content', description);
    } else if (descriptionTag) descriptionTag.remove();
    let ogTag = document.querySelector('meta[property="og:image"]');
    if (openGraphImage) {
      if (!ogTag) { ogTag = document.createElement('meta'); ogTag.setAttribute('property', 'og:image'); document.head.appendChild(ogTag); }
      ogTag.setAttribute('content', openGraphImage);
    } else if (ogTag) ogTag.remove();
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
      icon.href = favicon;
    } else if (icon) icon.remove();
  }, [content.seo]);
  const renderSection = (key: SectionKey) => {
    switch (key) {
      case 'hero': return <HeroSection key={key} content={content} />;
      case 'doors': return <DoorsSection key={key} content={content} />;
      case 'projects': return <ProjectsSection key={key} content={content} />;
      case 'experience': return <StorySection key={key} content={content} />;
      case 'education': return <EducationSection key={key} content={content} />;
      case 'skills': return <SkillsSection key={key} content={content} />;
      case 'achievements': return <AchievementsSection key={key} content={content} />;
      case 'contact': return <ContactSection key={key} content={content} />;
    }
  };
  return <div className="public-site" style={vars} id="top">
    {draftMode ? <div className="preview-ribbon"><span>DRAFT PREVIEW — not public</span><div><button onClick={onBack}>Back to admin</button>{onPublish ? <button onClick={onPublish}>Publish</button> : null}</div></div> : null}
    <SiteHeader content={content} />
    <main>{activeSections.map(renderSection)}</main>
    <PublicFooter content={content} />
  </div>;
}

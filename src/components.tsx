import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { uploadImage } from './store';

type FieldKind = 'text' | 'password' | 'textarea' | 'url' | 'email' | 'number' | 'date' | 'color' | 'toggle' | 'select' | 'image' | 'lines';
export type FieldDefinition = { key: string; label: string; type?: FieldKind; help?: string; options?: string[]; rows?: number; placeholder?: string };
type UploadHandler = (file: File) => Promise<string>;

export function PanelIntro({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="panel-intro">
    <div><div className="eyebrow">{eyebrow || 'CONTENT MANAGEMENT'}</div><h1>{title}</h1>{children ? <p>{children}</p> : null}</div>
    {action ? <div className="panel-intro-action">{action}</div> : null}
  </div>;
}

export function InfoNote({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warning' | 'success' }) {
  return <div className={`info-note ${tone}`}>{children}</div>;
}

export function FormField({
  label, value, onChange, type = 'text', help, options = [], rows = 4, placeholder, uploadHandler,
}: {
  label: string; value: unknown; onChange: (value: string | number | boolean) => void; type?: FieldKind;
  help?: string; options?: string[]; rows?: number; placeholder?: string; uploadHandler?: UploadHandler;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const id = `field-${useId().replace(/:/g, '')}`;
  const valueString = typeof value === 'string' ? value : value == null ? '' : String(value);
  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const url = uploadHandler ? await uploadHandler(file) : await uploadImage(file);
      onChange(url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (type === 'toggle') {
    return <label className="form-field toggle-field" htmlFor={id}>
      <span className="field-copy"><span className="field-label">{label}</span>{help ? <span className="field-help">{help}</span> : null}</span>
      <input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>;
  }

  return <div className={`form-field ${type === 'image' ? 'image-field' : ''}`}>
    <label className="field-label" htmlFor={id}>{label}</label>
    {help ? <span className="field-help">{help}</span> : null}
    {type === 'textarea' || type === 'lines' ? <textarea id={id} value={valueString} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      : type === 'select' ? <select id={id} value={valueString} onChange={(event) => onChange(event.target.value)}><option value="">Select…</option>{options.map((option) => <option value={option} key={option}>{option}</option>)}</select>
        : type === 'image' ? <div className="image-field-body">
          {valueString ? <div className="image-preview"><img src={valueString} alt={`${label} preview`} loading="lazy" /><button type="button" className="mini-button" onClick={(event) => { event.preventDefault(); onChange(''); }}>Remove</button></div> : null}
          <div className="image-url-row"><input id={id} type="url" value={valueString.startsWith('data:') ? '' : valueString} placeholder={placeholder || 'Paste an image URL'} onChange={(event) => onChange(event.target.value)} />
            <label className="upload-button">{uploading ? 'Uploading…' : 'Upload'}<input type="file" accept="image/*" disabled={uploading} onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
          </div>
          {valueString.startsWith('data:') ? <span className="field-help">Stored as a local preview image.</span> : null}
          {uploadError ? <span className="field-error">{uploadError}</span> : null}
        </div>
          : type === 'color' ? <div className="color-input"><input id={id} type="color" value={/^#[0-9a-f]{6}$/i.test(valueString) ? valueString : '#f3eee6'} onChange={(event) => onChange(event.target.value)} /><input type="text" value={valueString} placeholder="#f3eee6" onChange={(event) => onChange(event.target.value)} /></div>
            : <input id={id} type={type === 'number' ? 'number' : type} value={valueString} placeholder={placeholder} onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} />}
  </div>;
}

export function StringListField({ label, value, onChange, help, placeholder }: { label: string; value: string[]; onChange: (value: string[]) => void; help?: string; placeholder?: string }) {
  return <FormField label={label} type="lines" value={(value ?? []).join('\n')} onChange={(text) => onChange(String(text).split('\n').map((line) => line.trim()).filter(Boolean))} help={help || 'Enter one item per line.'} placeholder={placeholder || 'One entry per line'} rows={5} />;
}

export function CollectionEditor<T extends { id: string; [key: string]: unknown }>({
  title, description, items, fields, createItem, onChange, uploadHandler, emptyLabel = 'No entries yet.',
}: {
  title: string; description?: string; items: T[]; fields: FieldDefinition[]; createItem: (index: number) => T;
  onChange: (items: T[]) => void; uploadHandler?: UploadHandler; emptyLabel?: string;
}) {
  const [selected, setSelected] = useState(0);
  const activeIndex = items.length ? Math.min(selected, items.length - 1) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const displayLabel = (item: T) => {
    const titleField = fields.find((field) => ['title', 'name', 'position', 'institution', 'platform', 'label'].includes(field.key));
    const text = titleField ? String(item[titleField.key] ?? '').trim() : '';
    return text || 'New item';
  };
  const add = () => {
    const next = [...items, createItem(items.length)];
    onChange(next);
    setSelected(next.length - 1);
  };
  const patch = (key: string, value: unknown) => {
    if (activeIndex < 0) return;
    onChange(items.map((item, index) => index === activeIndex ? { ...item, [key]: value } : item));
  };
  const move = (direction: -1 | 1) => {
    if (activeIndex < 0) return;
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    [next[activeIndex], next[nextIndex]] = [next[nextIndex], next[activeIndex]];
    const ordered = next.map((item, index) => 'order' in item ? { ...item, order: index } as T : item);
    onChange(ordered);
    setSelected(nextIndex);
  };
  const duplicate = () => {
    if (!activeItem) return;
    const copy = { ...activeItem, id: crypto.randomUUID() } as T;
    const next = [...items.slice(0, activeIndex + 1), copy, ...items.slice(activeIndex + 1)];
    onChange(next);
    setSelected(activeIndex + 1);
  };
  const remove = () => {
    if (activeIndex < 0) return;
    const next = items.filter((_, index) => index !== activeIndex);
    onChange(next);
    setSelected(Math.max(0, activeIndex - 1));
  };

  return <section className="collection-editor">
    <div className="collection-heading"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div><button type="button" className="button dark small" onClick={add}>＋ Add entry</button></div>
    <div className="collection-body">
      <div className="collection-list" aria-label={`${title} entries`}>
        {items.length ? items.map((item, index) => <button key={item.id} type="button" className={`collection-item ${index === activeIndex ? 'selected' : ''}`} onClick={() => setSelected(index)}>
          <span className="collection-index">{String(index + 1).padStart(2, '0')}</span><span className="collection-item-label">{displayLabel(item)}</span><span className="collection-item-dot" /></button>)
          : <div className="collection-empty">{emptyLabel}</div>}
      </div>
      <div className="collection-detail">
        {!activeItem ? <div className="collection-placeholder"><span className="empty-mark">＋</span><p>Add an entry to configure it. Empty entries are never shown on the public site.</p></div> : <>
          <div className="collection-toolbar"><span>ENTRY {String(activeIndex + 1).padStart(2, '0')}</span><div>
            <button type="button" className="mini-button" title="Move up" onClick={() => move(-1)} disabled={activeIndex === 0}>↑</button>
            <button type="button" className="mini-button" title="Move down" onClick={() => move(1)} disabled={activeIndex === items.length - 1}>↓</button>
            <button type="button" className="mini-button" onClick={duplicate}>Duplicate</button>
            <button type="button" className="mini-button danger" onClick={remove}>Delete</button>
          </div></div>
          <div className="field-grid">
            {fields.map((field) => <div className={`field-span-${field.type === 'textarea' || field.type === 'lines' || field.type === 'image' ? 'full' : 'half'}`} key={field.key}>
              <FormField label={field.label} type={field.type} value={activeItem[field.key]} help={field.help} options={field.options} rows={field.rows} placeholder={field.placeholder} uploadHandler={uploadHandler} onChange={(value) => patch(field.key, value)} />
            </div>)}
          </div>
        </>}
      </div>
    </div>
  </section>;
}

export function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="section-card"><div className="section-card-head"><h2>{title}</h2>{action}</div>{children}</section>;
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'positive' | 'warning' }) {
  return <span className={`status-pill ${tone}`}><span />{children}</span>;
}

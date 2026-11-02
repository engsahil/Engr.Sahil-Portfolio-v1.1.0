import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { emptyContent, mergeContent } from './defaults';
import type { AdminWorkspace, ContactSubmission, PortfolioContent, PublishedVersion } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export const backendMode: 'supabase' | 'local-preview' | 'unconfigured' = supabase
  ? 'supabase'
  : import.meta.env.DEV ? 'local-preview' : 'unconfigured';
export const isLocalPreview = backendMode === 'local-preview';

const STORE_KEY = 'reference-portfolio-state-v1';
const SESSION_KEY = 'reference-portfolio-local-session';
const LOCAL_EVENT = 'reference-portfolio-local-published';

type LocalAdmin = { email: string; salt: string; hash: string; createdAt: string };
type LocalState = {
  admin: LocalAdmin | null;
  draft: PortfolioContent;
  published: PortfolioContent;
  versions: PublishedVersion[];
  submissions: ContactSubmission[];
  draftUpdatedAt: string;
  publishedUpdatedAt: string;
};

function blankLocalState(): LocalState {
  return {
    admin: null,
    draft: emptyContent(),
    published: emptyContent(),
    versions: [],
    submissions: [],
    draftUpdatedAt: '',
    publishedUpdatedAt: '',
  };
}

function readLocal(): LocalState {
  try {
    if (typeof localStorage === 'undefined') return blankLocalState();
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blankLocalState();
    const parsed = JSON.parse(raw) as Partial<LocalState>;
    return {
      ...blankLocalState(),
      ...parsed,
      admin: parsed.admin ?? null,
      draft: mergeContent(parsed.draft),
      published: mergeContent(parsed.published),
      versions: Array.isArray(parsed.versions) ? parsed.versions.map((v) => ({ ...v, content: mergeContent(v.content) })) : [],
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
    };
  } catch {
    return blankLocalState();
  }
}

function writeLocal(state: LocalState): void {
  try {
    if (typeof localStorage === 'undefined') throw new Error('Browser storage is not available.');
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    throw new Error('Browser storage is full. Use smaller images or connect Supabase Storage.');
  }
}

function emitLocalPublished(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT));
  try { localStorage.setItem('reference-portfolio-published-signal', String(Date.now())); } catch { /* no-op */ }
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function passwordHash(password: string, salt: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Secure browser cryptography is required to set a password.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: decodeBase64(salt), iterations: 210_000, hash: 'SHA-256' }, key, 256);
  return encodeBase64(new Uint8Array(bits));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function bootstrapStatus(): Promise<{ configured: boolean; adminExists: boolean }> {
  if (backendMode === 'unconfigured') return { configured: false, adminExists: false };
  if (isLocalPreview) return { configured: true, adminExists: Boolean(readLocal().admin) };
  const { data, error } = await supabase!.functions.invoke('bootstrap-admin', { body: { action: 'status' } });
  if (error) throw new Error(error.message || 'Could not check the initial admin setup status.');
  return { configured: true, adminExists: Boolean((data as { adminExists?: boolean } | null)?.adminExists) };
}

export async function createFirstAdmin(email: string, password: string, setupKey = ''): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Enter a valid administrator email.');
  if (password.length < 12) throw new Error('Use a password with at least 12 characters.');
  if (backendMode === 'unconfigured') throw new Error('Connect Supabase before creating the administrator account.');
  if (isLocalPreview) {
    const state = readLocal();
    if (state.admin) throw new Error('Initial setup has already been completed in this browser.');
    const saltBytes = crypto.getRandomValues(new Uint8Array(18));
    const salt = encodeBase64(saltBytes);
    state.admin = { email: normalizedEmail, salt, hash: await passwordHash(password, salt), createdAt: new Date().toISOString() };
    writeLocal(state);
    sessionStorage.setItem(SESSION_KEY, '1');
    return;
  }
  const { data, error } = await supabase!.functions.invoke('bootstrap-admin', {
    body: { action: 'bootstrap', email: normalizedEmail, password },
    headers: { 'x-bootstrap-secret': setupKey },
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.clone().json() as { error?: string };
        if (body.error) throw new Error(body.error);
      } catch (readError) {
        if (readError instanceof Error && readError.message !== 'Unexpected end of JSON input') throw readError;
      }
    }
    throw new Error(error.message || 'Administrator setup failed.');
  }
  if (!(data as { ok?: boolean } | null)?.ok) throw new Error('The setup service did not confirm administrator creation.');
  const { error: signInError } = await supabase!.auth.signInWithPassword({ email: normalizedEmail, password });
  if (signInError) throw new Error(`Administrator created; sign in to continue. ${signInError.message}`);
}

export async function signIn(email: string, password: string): Promise<void> {
  if (backendMode === 'unconfigured') throw new Error('Connect Supabase before signing in.');
  if (isLocalPreview) {
    const admin = readLocal().admin;
    if (!admin) throw new Error('No administrator has been created yet.');
    if (admin.email !== email.trim().toLowerCase() || !constantTimeEqual(admin.hash, await passwordHash(password, admin.salt))) {
      throw new Error('Email or password is incorrect.');
    }
    sessionStorage.setItem(SESSION_KEY, '1');
    return;
  }
  const { data, error } = await supabase!.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) throw new Error(error?.message || 'Sign in failed.');
  const { data: adminRow, error: adminError } = await supabase!.from('admin_accounts').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (adminError || !adminRow) {
    await supabase!.auth.signOut();
    throw new Error('This account is not an administrator.');
  }
}

export async function getAdminSession(): Promise<{ authenticated: boolean; email: string }> {
  if (backendMode === 'unconfigured') return { authenticated: false, email: '' };
  if (isLocalPreview) {
    const authenticated = sessionStorage.getItem(SESSION_KEY) === '1' && Boolean(readLocal().admin);
    return { authenticated, email: authenticated ? readLocal().admin!.email : '' };
  }
  const { data } = await supabase!.auth.getSession();
  const user = data.session?.user;
  if (!user) return { authenticated: false, email: '' };
  const { data: adminRow, error } = await supabase!.from('admin_accounts').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error || !adminRow) {
    await supabase!.auth.signOut();
    return { authenticated: false, email: '' };
  }
  return { authenticated: true, email: user.email ?? '' };
}

export async function signOut(): Promise<void> {
  if (isLocalPreview) sessionStorage.removeItem(SESSION_KEY);
  else if (supabase) await supabase.auth.signOut();
}

export async function changeAdminPassword(password: string): Promise<void> {
  if (password.length < 12) throw new Error('Use a password with at least 12 characters.');
  if (isLocalPreview) {
    const state = readLocal();
    if (!state.admin || sessionStorage.getItem(SESSION_KEY) !== '1') throw new Error('Sign in again before changing the password.');
    const salt = encodeBase64(crypto.getRandomValues(new Uint8Array(18)));
    state.admin = { ...state.admin, salt, hash: await passwordHash(password, salt) };
    writeLocal(state);
    return;
  }
  if (!supabase) throw new Error('Connect Supabase before changing the password.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

function workspaceFromLocal(state: LocalState): AdminWorkspace {
  return {
    draft: mergeContent(state.draft), published: mergeContent(state.published),
    versions: state.versions, submissions: state.submissions,
    draftUpdatedAt: state.draftUpdatedAt, publishedUpdatedAt: state.publishedUpdatedAt,
  };
}

export async function loadAdminWorkspace(): Promise<AdminWorkspace> {
  if (backendMode === 'unconfigured') throw new Error('Supabase is not configured.');
  if (isLocalPreview) return workspaceFromLocal(readLocal());
  const [draftResult, publishedResult, versionsResult, submissionsResult] = await Promise.all([
    supabase!.from('portfolio_drafts').select('content, updated_at').eq('id', 'primary').maybeSingle(),
    supabase!.from('published_portfolio').select('content, published_at').eq('id', 'primary').maybeSingle(),
    supabase!.from('portfolio_versions').select('id, content, created_at').order('created_at', { ascending: false }).limit(30),
    supabase!.from('contact_submissions').select('id, name, email, message, extra_fields, created_at, read_at').order('created_at', { ascending: false }).limit(200),
  ]);
  for (const result of [draftResult, publishedResult, versionsResult, submissionsResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const draftRow = draftResult.data;
  const publishedRow = publishedResult.data;
  return {
    draft: mergeContent(draftRow?.content),
    published: mergeContent(publishedRow?.content),
    draftUpdatedAt: draftRow?.updated_at ?? '',
    publishedUpdatedAt: publishedRow?.published_at ?? '',
    versions: (versionsResult.data ?? []).map((row) => ({ id: row.id, content: mergeContent(row.content), createdAt: row.created_at })),
    submissions: (submissionsResult.data ?? []).map((row) => ({ id: row.id, name: row.name, email: row.email, message: row.message, fields: row.extra_fields ?? {}, createdAt: row.created_at, readAt: row.read_at ?? undefined })),
  };
}

export async function saveDraft(content: PortfolioContent): Promise<string> {
  const updatedAt = new Date().toISOString();
  if (backendMode === 'unconfigured') throw new Error('Supabase is not configured.');
  if (isLocalPreview) {
    const state = readLocal();
    state.draft = mergeContent(content);
    state.draftUpdatedAt = updatedAt;
    writeLocal(state);
    return updatedAt;
  }
  const { data: userResult } = await supabase!.auth.getUser();
  if (!userResult.user) throw new Error('Your admin session has expired. Sign in again.');
  const { error } = await supabase!.from('portfolio_drafts').upsert({ id: 'primary', content, updated_at: updatedAt, updated_by: userResult.user.id });
  if (error) throw new Error(error.message);
  return updatedAt;
}

export async function publishDraft(content: PortfolioContent): Promise<void> {
  if (backendMode === 'unconfigured') throw new Error('Supabase is not configured.');
  if (isLocalPreview) {
    const state = readLocal();
    const now = new Date().toISOString();
    state.versions.unshift({ id: crypto.randomUUID(), content: mergeContent(state.published), createdAt: now });
    state.versions = state.versions.slice(0, 30);
    state.published = mergeContent(content);
    state.draft = mergeContent(content);
    state.publishedUpdatedAt = now;
    state.draftUpdatedAt = now;
    writeLocal(state);
    emitLocalPublished();
    return;
  }
  const { error } = await supabase!.rpc('publish_portfolio_content', { p_content: content });
  if (error) throw new Error(error.message);
}

export async function publishSelectedContent(content: PortfolioContent): Promise<void> {
  if (backendMode === 'unconfigured') throw new Error('Supabase is not configured.');
  if (isLocalPreview) {
    const state = readLocal();
    const now = new Date().toISOString();
    state.versions.unshift({ id: crypto.randomUUID(), content: mergeContent(state.published), createdAt: now });
    state.versions = state.versions.slice(0, 30);
    state.published = mergeContent(content);
    state.publishedUpdatedAt = now;
    writeLocal(state);
    emitLocalPublished();
    return;
  }
  const { error } = await supabase!.rpc('publish_selected_portfolio_content', { p_content: content });
  if (error) throw new Error(error.message);
}

export async function getPublicLaunchState(): Promise<{ configured: boolean; installed: boolean; content: PortfolioContent }> {
  if (backendMode === 'unconfigured') return { configured: false, installed: false, content: emptyContent() };
  if (isLocalPreview) {
    const state = readLocal();
    return { configured: true, installed: Boolean(state.admin), content: mergeContent(state.published) };
  }
  const { data, error } = await supabase!.from('published_portfolio').select('content').eq('id', 'primary').maybeSingle();
  if (error) throw new Error(error.message);
  return { configured: true, installed: Boolean(data), content: mergeContent(data?.content) };
}

export async function getPublishedContent(): Promise<PortfolioContent> {
  if (backendMode === 'unconfigured') return emptyContent();
  if (isLocalPreview) return mergeContent(readLocal().published);
  const { data, error } = await supabase!.from('published_portfolio').select('content').eq('id', 'primary').maybeSingle();
  if (error) throw new Error(error.message);
  return mergeContent(data?.content);
}

export function subscribePublished(callback: (content: PortfolioContent) => void): () => void {
  if (isLocalPreview) {
    const onLocal = () => { void getPublishedContent().then(callback); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'reference-portfolio-published-signal') onLocal();
    };
    window.addEventListener(LOCAL_EVENT, onLocal);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LOCAL_EVENT, onLocal);
      window.removeEventListener('storage', onStorage);
    };
  }
  if (!supabase) return () => undefined;
  const channel = supabase.channel('published-portfolio-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'published_portfolio' }, (payload) => {
      const next = (payload.new as { content?: unknown } | undefined)?.content;
      if (next) callback(mergeContent(next));
    })
    .subscribe();
  return () => { void supabase!.removeChannel(channel); };
}

export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Images must be 8 MB or smaller.');
  if (backendMode === 'unconfigured') throw new Error('Connect Supabase to upload persistent images.');
  if (isLocalPreview) return compressToDataUrl(file);
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'img';
  const objectPath = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase!.storage.from('portfolio-media').upload(objectPath, file, { upsert: false, cacheControl: '31536000', contentType: file.type });
  if (error) throw new Error(error.message);
  const { data: publicData } = supabase!.storage.from('portfolio-media').getPublicUrl(data.path);
  return publicData.publicUrl;
}

function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxDimension = 1440;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) { URL.revokeObjectURL(objectUrl); reject(new Error('Could not process the image.')); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL('image/webp', 0.82);
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read this image.')); };
    image.src = objectUrl;
  });
}

export async function saveMediaToLibrary(name: string, url: string, type = 'image'): Promise<void> {
  const state = readLocal();
  const asset = { id: crypto.randomUUID(), name, url, type, uploadedAt: new Date().toISOString() };
  if (isLocalPreview) {
    state.draft.media.unshift(asset);
    state.draftUpdatedAt = new Date().toISOString();
    writeLocal(state);
    return;
  }
  // Media references live with the editable draft document, so they follow the same RLS rules.
  const workspace = await loadAdminWorkspace();
  workspace.draft.media.unshift(asset);
  await saveDraft(workspace.draft);
}

export async function submitContact(input: { name: string; email: string; message: string; fields?: Record<string, string> }): Promise<void> {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();
  const fields = Object.fromEntries(Object.entries(input.fields ?? {}).map(([key, value]) => [key.trim().slice(0, 100), String(value).trim().slice(0, 1000)]).filter(([key]) => Boolean(key)));
  if (!name || name.length > 120) throw new Error('Enter a name of 1–120 characters.');
  if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!message || message.length > 6000) throw new Error('Enter a message of 1–6000 characters.');
  if (Object.keys(fields).length > 20 || new TextEncoder().encode(JSON.stringify(fields)).length > 10000) throw new Error('The extra fields exceed the allowed size.');
  if (backendMode === 'unconfigured') throw new Error('Contact submissions are not configured.');
  if (isLocalPreview) {
    const state = readLocal();
    state.submissions.unshift({ id: crypto.randomUUID(), name, email, message, fields, createdAt: new Date().toISOString() });
    writeLocal(state);
    return;
  }
  const { error } = await supabase!.from('contact_submissions').insert({ name, email, message, extra_fields: fields });
  if (error) throw new Error(error.message);
}

export async function deleteMediaReference(id: string): Promise<void> {
  if (isLocalPreview) {
    const state = readLocal();
    state.draft.media = state.draft.media.filter((asset) => asset.id !== id);
    writeLocal(state);
    return;
  }
  const workspace = await loadAdminWorkspace();
  workspace.draft.media = workspace.draft.media.filter((asset) => asset.id !== id);
  await saveDraft(workspace.draft);
}

export function backendSetupNote(): string {
  return backendMode === 'local-preview'
    ? 'Local preview mode: this browser stores drafts and credentials locally. It is for visual testing only; connect Supabase before deployment.'
    : 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, deploy the supplied schema and bootstrap function, then reload.';
}

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AdminArea } from './AdminArea';
import { PublicSite } from './PublicSite';
import { backendMode, backendSetupNote, bootstrapStatus, createFirstAdmin, getPublicLaunchState, getPublishedContent, signIn, subscribePublished } from './store';
import { emptyContent } from './defaults';
import type { PortfolioContent } from './types';

function useBrowserPath(): [string, (path: string) => void] {
  const [path, setPath] = useState(`${window.location.pathname}${window.location.search}`);
  useEffect(() => {
    const onPop = () => setPath(`${window.location.pathname}${window.location.search}`);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((next: string) => {
    if (next === `${window.location.pathname}${window.location.search}`) return;
    window.history.pushState({}, '', next);
    setPath(`${window.location.pathname}${window.location.search}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  return [path, navigate];
}

function AppLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return <a href={to} className={className} onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')); }}>{children}</a>;
}

function AuthShell({ children, mode }: { children: ReactNode; mode: 'setup' | 'login' }) {
  return <main className="auth-screen">
    <aside className="auth-visual">
      <div className="auth-visual-mark"><span>◌</span><div><b>ADMIN</b><small>PRIVATE WORKSPACE</small></div></div>
      <div className="auth-visual-copy"><div className="eyebrow">REFERENCE-INSPIRED PORTFOLIO</div><h2>{mode === 'setup' ? 'Start with an empty canvas.' : 'Your content, under your control.'}</h2><p>{mode === 'setup' ? 'Configure the administrator first. Personal details stay blank until you add them.' : 'Sign in to edit drafts, preview changes, and publish your portfolio.'}</p></div>
      <div className="auth-door-art" aria-hidden="true"><span className="auth-door one" /><span className="auth-door two" /><span className="auth-door three" /><span className="auth-door four" /></div>
      <span className="auth-visual-foot">CREAM · CHARCOAL · ARCHES</span>
    </aside>
    <section className="auth-form-side"><div className="auth-form-wrap">{children}</div><div className="auth-footer">{mode === 'login' ? <AppLink to="/">← Public portfolio</AppLink> : <span>Initial setup</span>}<span>Protected administration</span></div></section>
  </main>;
}

function SetupPage({ navigate }: { navigate: (path: string) => void }) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'exists' | 'unconfigured' | 'error'>('checking');
  const [error, setError] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [setupKey, setSetupKey] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void bootstrapStatus().then((result) => {
      if (!live) return;
      if (!result.configured) setStatus('unconfigured');
      else if (result.adminExists) { setStatus('exists'); navigate('/admin/login'); }
      else setStatus('ready');
    }).catch((reason) => { if (live) { setError(reason instanceof Error ? reason.message : 'Could not check setup status.'); setStatus('error'); } });
    return () => { live = false; };
  }, [navigate]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 12) { setError('Use a password with at least 12 characters.'); return; }
    if (backendMode === 'supabase' && !setupKey.trim()) { setError('Enter the one-time setup key configured for the Supabase bootstrap function.'); return; }
    setBusy(true);
    try { await createFirstAdmin(email, password, setupKey); navigate('/admin/profile'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Administrator setup failed.'); }
    finally { setBusy(false); }
  };
  return <AuthShell mode="setup"><div className="auth-heading"><span className="auth-step">INITIAL ADMIN · 01 / 02</span><h1>Secure setup</h1><p>Create the one administrator. Public registration stays disabled after this step.</p></div>
    {status === 'checking' ? <div className="auth-loading"><span className="loading-mark" />Checking setup status…</div> : null}
    {status === 'exists' ? <div className="auth-message-block"><span className="auth-check">✓</span><h2>Setup is already complete.</h2><p>The initial setup route is closed because an administrator account exists.</p><button className="button dark full" onClick={() => navigate('/admin/login')}>Go to admin login</button></div> : null}
    {status === 'unconfigured' ? <div className="auth-message-block"><span className="auth-lock">⌑</span><h2>Connect a secure backend.</h2><p>{backendSetupNote()}</p><div className="setup-help"><b>Required before first setup</b><ol><li>Set the two browser Supabase environment variables.</li><li>Run <code>supabase/schema.sql</code>.</li><li>Deploy <code>bootstrap-admin</code> and set its private <code>BOOTSTRAP_SECRET</code>.</li></ol></div></div> : null}
    {status === 'error' ? <div className="auth-message-block"><h2>Setup status could not be checked.</h2><p>{error}</p><button className="button soft full" onClick={() => window.location.reload()}>Try again</button></div> : null}
    {status === 'ready' ? <form className="auth-form" onSubmit={(event) => void submit(event)}>
      {backendMode === 'local-preview' ? <div className="auth-warning">Local preview only — credentials are stored in this browser and are not production-secure. Connect Supabase before deployment.</div> : null}
      <label>Administrator email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label>
      <label>Administrator password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} /><small>At least 12 characters.</small></label>
      <label>Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>
      {backendMode === 'supabase' ? <label>One-time setup key<input type="password" autoComplete="off" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} required /><small>Set privately as the Edge Function secret <code>BOOTSTRAP_SECRET</code>.</small></label> : null}
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <button className="button dark full" type="submit" disabled={busy}>{busy ? 'Creating secure account…' : 'Create administrator'}<span>↗</span></button>
    </form> : null}
    {status !== 'exists' ? <div className="auth-bottom-link">Already have an account? <button onClick={() => navigate('/admin/login')}>Sign in</button></div> : null}
  </AuthShell>;
}

function LoginPage({ navigate }: { navigate: (path: string) => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  useEffect(() => { let live = true; void bootstrapStatus().then((result) => { if (live) setHasAdmin(result.configured ? result.adminExists : null); }).catch(() => { if (live) setHasAdmin(null); }); return () => { live = false; }; }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await signIn(email, password); navigate('/admin'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign in failed.'); } finally { setBusy(false); } };
  return <AuthShell mode="login"><div className="auth-heading"><span className="auth-step">ADMINISTRATOR ACCESS</span><h1>Welcome back.</h1><p>Sign in to manage portfolio content and publishing.</p></div>
    {backendMode === 'local-preview' ? <div className="auth-warning">Local preview mode — this browser-only account is for visual testing, not production authentication.</div> : null}
    <form className="auth-form" onSubmit={(event) => void submit(event)}><label>Administrator email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      {error ? <div className="form-error" role="alert">{error}</div> : null}<button className="button dark full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<span>↗</span></button></form>
    {hasAdmin === false ? <div className="auth-bottom-link">No administrator exists yet. <button onClick={() => navigate('/admin/setup')}>Initial setup</button></div> : null}
    {hasAdmin === true ? <div className="auth-bottom-link">Initial setup is disabled. <span>Public registration is closed.</span></div> : null}
  </AuthShell>;
}

function PublicPage({ initialContent }: { initialContent?: PortfolioContent }) {
  const [content, setContent] = useState<PortfolioContent>(initialContent ?? emptyContent());
  useEffect(() => {
    let live = true; let liveRevision = 0;
    const unsubscribe = subscribePublished((latest) => { liveRevision += 1; if (live) setContent(latest); });
    const requestRevision = liveRevision;
    if (initialContent === undefined) {
      void getPublishedContent().then((loaded) => { if (live && liveRevision === requestRevision) setContent(loaded); }).catch(() => { if (live && liveRevision === requestRevision) setContent(emptyContent()); });
    }
    return () => { live = false; unsubscribe(); };
  }, [initialContent]);
  return <PublicSite content={content} />;
}

function FirstLaunchPage({ navigate }: { navigate: (path: string) => void }) {
  const [destination, setDestination] = useState<'checking' | 'setup' | 'public'>('checking');
  const [initialContent, setInitialContent] = useState<PortfolioContent | undefined>();
  useEffect(() => {
    let live = true;
    void getPublicLaunchState().then((result) => {
      if (!live) return;
      if (!result.configured || !result.installed) setDestination('setup');
      else { setInitialContent(result.content); setDestination('public'); }
    }).catch(() => { if (live) setDestination('setup'); });
    return () => { live = false; };
  }, []);
  if (destination === 'checking') return <main className="admin-loading"><span className="loading-mark" /><p>Checking first-time setup…</p></main>;
  return destination === 'setup' ? <SetupPage navigate={navigate} /> : <PublicPage initialContent={initialContent} />;
}

export default function App() {
  const [path, navigate] = useBrowserPath();
  const route = path.split('?')[0].replace(/\/$/, '') || '/';
  if (route === '/admin/setup') return <SetupPage navigate={navigate} />;
  if (route === '/admin/login') return <LoginPage navigate={navigate} />;
  if (route === '/') return <FirstLaunchPage navigate={navigate} />;
  if (route.startsWith('/admin')) return <AdminArea path={route} navigate={navigate} />;
  return <PublicPage />;
}

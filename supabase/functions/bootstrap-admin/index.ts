import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-bootstrap-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Server configuration is incomplete.' }, 500);
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let body: { action?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  if (body.action === 'status') {
    const { count, error } = await adminClient.from('admin_accounts').select('user_id', { count: 'exact', head: true });
    if (error) return jsonResponse({ error: 'Could not read administrator status.' }, 500);
    return jsonResponse({ adminExists: (count ?? 0) > 0 });
  }

  if (body.action !== 'bootstrap') return jsonResponse({ error: 'Unsupported action.' }, 400);
  const expectedSecret = Deno.env.get('BOOTSTRAP_SECRET') ?? '';
  const suppliedSecret = request.headers.get('x-bootstrap-secret') ?? '';
  if (expectedSecret.length < 32 || !safeEqual(suppliedSecret, expectedSecret)) {
    return jsonResponse({ error: 'The one-time setup key is invalid.' }, 403);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  if (password.length < 12 || password.length > 128) return jsonResponse({ error: 'Password must be between 12 and 128 characters.' }, 400);

  const { count, error: countError } = await adminClient.from('admin_accounts').select('user_id', { count: 'exact', head: true });
  if (countError) return jsonResponse({ error: 'Could not verify setup status.' }, 500);
  if ((count ?? 0) > 0) return jsonResponse({ error: 'Initial administrator setup has already been completed.' }, 409);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) return jsonResponse({ error: createError?.message ?? 'Could not create administrator.' }, 400);

  const { data: claimed, error: claimError } = await adminClient.rpc('claim_first_portfolio_admin', { p_user_id: created.user.id });
  if (claimError || claimed !== true) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return jsonResponse({ error: claimError?.message ?? 'Initial setup has already been completed.' }, 409);
  }

  return jsonResponse({ ok: true }, 201);
});

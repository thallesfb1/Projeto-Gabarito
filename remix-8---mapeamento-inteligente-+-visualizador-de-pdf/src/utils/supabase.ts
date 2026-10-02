import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key && typeof window !== 'undefined' && window.location.protocol !== 'file:'
  ? createClient(url, key, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: (input, init) => {
        const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const timeout = AbortSignal.timeout(new URL(address).pathname.startsWith('/storage/v1/') ? 60000 : 15000);
        return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
      } },
    })
  : null;

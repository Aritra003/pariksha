import { createClient } from '@supabase/supabase-js'

// Disable Next.js's extended fetch cache for all Supabase requests
// so data is always fresh across API routes.
const noStoreOptions = {
  global: {
    fetch: (url: RequestInfo | URL, init?: RequestInit) =>
      fetch(url, { ...init, cache: 'no-store' }),
  },
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  noStoreOptions
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  noStoreOptions
)

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Demomodus: geen Supabase nodig, data blijft in het browsergeheugen.
// Handig om de app te bekijken vóór de Supabase-setup (npm run dev met VITE_DEMO=1).
export const demoModus = import.meta.env.VITE_DEMO === '1'

export const supabaseGeconfigureerd = demoModus || Boolean(url && anonKey)

export const supabase = !demoModus && supabaseGeconfigureerd ? createClient(url, anonKey) : null

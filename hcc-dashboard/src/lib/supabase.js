import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const url = supabaseUrl
const anonKey = supabaseAnonKey

// Demomodus: geen Supabase nodig, data blijft in het browsergeheugen.
// Handig om de app te bekijken vóór de Supabase-setup (npm run dev met VITE_DEMO=1).
export const demoModus = import.meta.env.VITE_DEMO === '1'

export const supabaseGeconfigureerd = demoModus || Boolean(url && anonKey)

export const supabase = !demoModus && supabaseGeconfigureerd ? createClient(url, anonKey) : null

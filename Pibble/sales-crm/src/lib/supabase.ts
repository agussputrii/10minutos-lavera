import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://jlclamehpmxseovuvjha.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_le1xy6_1YiIQJe-innZl2Q_BKDEKlD-'

export const supabase = createClient(url, key)

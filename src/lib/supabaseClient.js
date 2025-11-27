import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.trim()

let supabase

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('[Supabase] Missing env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Add them to .env.local and restart dev server.')
	// Minimal stub so the app doesn’t crash; auth-dependent UI will behave as logged-out.
	supabase = {
		auth: {
			async getUser() {
				return { data: { user: null }, error: null }
			},
			onAuthStateChange() {
				return { data: { subscription: { unsubscribe() {} } } }
			},
			async signInWithPassword() {
				return { data: { user: null }, error: new Error('Supabase not configured') }
			},
			async signUp() {
				return { data: { user: null }, error: new Error('Supabase not configured') }
			},
			async signOut() { return { error: null } },
		},
		from() {
			return {
				select() { return Promise.resolve({ data: [], error: new Error('Supabase not configured') }) },
				insert() { return Promise.resolve({ data: null, error: new Error('Supabase not configured') }) },
				update() { return Promise.resolve({ data: null, error: new Error('Supabase not configured') }) },
				delete() { return Promise.resolve({ data: null, error: new Error('Supabase not configured') }) },
			}
		},
	}
} else {
	supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }
export default supabase

// Multi-announcement service (Supabase-backed)
// Table: announcements { id, message, severity, is_active, starts_at, ends_at, created_at }
// Table: announcement_settings { id=1, rotation_interval_sec }

import { supabase } from '../lib/supabaseClient'

const TABLE_ANNOUNCEMENTS = 'announcements'
const TABLE_SETTINGS = 'announcement_settings'

export async function getAnnouncements() {
	const { data, error } = await supabase
		.from(TABLE_ANNOUNCEMENTS)
		.select('*')
		.eq('is_active', true)
		.order('created_at', { ascending: false })
		.limit(5)

	if (error) {
		console.warn('[announcementService] getAnnouncements error', error.message)
		return []
	}
	return data || []
}

export async function addAnnouncement({ message, severity = 'info' }) {
	const payload = {
		message: message?.trim() || '',
		severity,
		is_active: true
	}
	const { data, error } = await supabase
		.from(TABLE_ANNOUNCEMENTS)
		.insert(payload)
		.select()
		.single()

	if (error) {
		console.warn('[announcementService] addAnnouncement error', error.message)
		return null
	}
	return data
}

export async function updateAnnouncement(id, updates) {
	if (!id) return null
	const { data, error } = await supabase
		.from(TABLE_ANNOUNCEMENTS)
		.update(updates)
		.eq('id', id)
		.select()
		.single()

	if (error) {
		console.warn('[announcementService] updateAnnouncement error', error.message)
		return null
	}
	return data
}

export async function deleteAnnouncement(id) {
	if (!id) return false
	const { error } = await supabase
		.from(TABLE_ANNOUNCEMENTS)
		.delete()
		.eq('id', id)

	if (error) {
		console.warn('[announcementService] deleteAnnouncement error', error.message)
		return false
	}
	return true
}

export async function clearAnnouncements() {
	const { error } = await supabase.from(TABLE_ANNOUNCEMENTS).delete().neq('id', '')
	if (error) {
		console.warn('[announcementService] clearAnnouncements error', error.message)
		return false
	}
	return true
}

export async function getRotationInterval() {
	const { data, error } = await supabase
		.from(TABLE_SETTINGS)
		.select('rotation_interval_sec')
		.eq('id', 1)
		.single()

	if (error || !data?.rotation_interval_sec) return 3
	const v = Number(data.rotation_interval_sec)
	if (!v || v < 1 || v > 5) return 3
	return v
}

export async function setRotationInterval(sec) {
	const n = Number(sec)
	const clamped = Math.min(5, Math.max(1, n || 3))
	const payload = { id: 1, rotation_interval_sec: clamped }
	const { error } = await supabase.from(TABLE_SETTINGS).upsert(payload)
	if (error) {
		console.warn('[announcementService] setRotationInterval error', error.message)
	}
	return clamped
}

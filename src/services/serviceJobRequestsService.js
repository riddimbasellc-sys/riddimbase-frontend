// Service layer for job requests using Supabase only (no localStorage fallback)
import {
  createJobRequestSupabase,
  listJobRequestsSupabase,
  listJobRequestsByUserSupabase,
  getJobRequestSupabase,
  addBidToJobSupabase,
  updateJobStatusSupabase,
  computeJobRequestsStatsSupabase,
  updateJobBidsSupabase,
  deleteJobRequestSupabase,
  getJobEscrowSupabase,
  markJobPaidSupabase,
  releaseJobFundsSupabase,
} from './serviceJobRequestsRepository'

export async function createJobRequest(fields) {
  if (!fields.userId || !fields.title || !fields.category) {
    return { error: 'Missing required fields' }
  }
  try {
    const job = await createJobRequestSupabase(fields)
    return { job }
  } catch (e) {
    console.warn('[createJobRequest] Supabase error', e?.message || e)
    return { error: e?.message || 'Failed to create job' }
  }
}

export async function queryJobRequests(filters) {
  try {
    const { data, count } = await listJobRequestsSupabase(filters)
    return { data, count, page: filters.page, pageSize: filters.pageSize }
  } catch {
    return { data: [], count: 0, page: filters.page, pageSize: filters.pageSize }
  }
}

export async function deleteJob(jobId) {
  if (!jobId) return
  try {
    await deleteJobRequestSupabase(jobId)
    return true
  } catch {
    return false
  }
}

export async function getJobRequest(jobId) {
  try { return await getJobRequestSupabase(jobId) } catch { return null }
}

export async function addBid(jobId, bidFields) {
  return addBidToJobSupabase(jobId, bidFields)
    .catch(()=> ({ error: 'Failed to add bid' }))
}

export async function updateJobStatus(jobId, status, assignedProviderId=null, assignedBidAmount=null) {
  return updateJobStatusSupabase(jobId, status, assignedProviderId, assignedBidAmount)
    .catch(()=> ({ error: 'Failed to update job status' }))
}

export async function declineBid(jobId, bidId) {
  if (!jobId || !bidId) return null
  try {
    const job = await getJobRequestSupabase(jobId)
    const bids = (job.bids || []).filter(b => b.id !== bidId)
    const updated = await updateJobBidsSupabase(jobId, bids)
    return updated
  } catch {
    return null
  }
}

export async function listUserJobRequests(userId) {
  if (!userId) return { data: [], count: 0 }
  try {
    const data = await listJobRequestsByUserSupabase(userId)
    return { data, count: data.length }
  } catch {
    return { data: [], count: 0 }
  }
}

export async function computeJobStats() {
  try { return await computeJobRequestsStatsSupabase() } catch {
    return { open:0, assigned:0, completed:0, cancelled:0, totalBudget:0 }
  }
}

export function saveJobDelivery(jobId, payload) {
  console.warn('[serviceJobRequestsService] saveJobDelivery called without persistent backend implementation')
  return { ...payload, updatedAt: new Date().toISOString() }
}

export function getJobDelivery(jobId) {
  console.warn('[serviceJobRequestsService] getJobDelivery called without persistent backend implementation', jobId)
  return null
}

export async function markJobPaid(jobId, amount=0, currency='USD', actorId=null) {
  try { return await markJobPaidSupabase(jobId, amount, currency, actorId) } catch {
    return { paid: false, released: false }
  }
}

export async function releaseJobFunds(jobId, actorId=null) {
  try { return await releaseJobFundsSupabase(jobId, actorId) } catch {
    return { paid: false, released: false }
  }
}

export async function getJobEscrow(jobId) {
  try { return await getJobEscrowSupabase(jobId) } catch {
    return { paid: false, released: false }
  }
}

export function addJobReview({ jobId, providerId, rating, text }) {
  if (!jobId || !providerId || !rating) return null
  console.warn('[serviceJobRequestsService] addJobReview called without persistent backend implementation')
  return { id: 'rev_' + Date.now(), jobId, providerId, rating: Number(rating), text: text || '', createdAt: new Date().toISOString() }
}

export function listProviderReviews(providerId) {
  if (!providerId) return []
  console.warn('[serviceJobRequestsService] listProviderReviews called without persistent backend implementation', providerId)
  return []
}

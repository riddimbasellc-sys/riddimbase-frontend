// Hybrid service layer for job requests (Supabase first, localStorage fallback)
import { createJobRequestSupabase, listJobRequestsSupabase, listJobRequestsByUserSupabase, getJobRequestSupabase, addBidToJobSupabase, updateJobStatusSupabase, computeJobRequestsStatsSupabase, updateJobBidsSupabase, deleteJobRequestSupabase } from './serviceJobRequestsRepository'

const LS_KEY = 'rb_job_requests_v1'
const DELIVERY_KEY = 'rb_job_deliveries_v1'
const ESCROW_KEY = 'rb_job_escrow_v1'
const REVIEWS_KEY = 'rb_job_reviews_v1'

function readAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]') } catch { return [] }
}
function writeAll(arr) { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)) } catch {} }
function readDeliveries() { try { return JSON.parse(localStorage.getItem(DELIVERY_KEY)||'{}') } catch { return {} } }
function writeDeliveries(map) { try { localStorage.setItem(DELIVERY_KEY, JSON.stringify(map)) } catch {} }
function readEscrow() { try { return JSON.parse(localStorage.getItem(ESCROW_KEY)||'{}') } catch { return {} } }
function writeEscrow(map) { try { localStorage.setItem(ESCROW_KEY, JSON.stringify(map)) } catch {} }
function readReviews() { try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)||'[]') } catch { return [] } }
function writeReviews(arr) { try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr)) } catch {} }

export async function createJobRequest(fields) {
  if (!fields.userId || !fields.title || !fields.category) return { error: 'Missing required fields' }
  return createJobRequestSupabase(fields)
    .then(job => ({ job }))
    .catch(()=> legacyCreate(fields))
}

function legacyCreate(fields) {
  const jobs = readAll()
  const id = 'jobloc_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)
  const now = new Date().toISOString()
  const job = { id, userId: fields.userId, title: fields.title, description: fields.description||'', category: fields.category, genres: fields.genres||[], budget: Number(fields.budget)||0, currency: fields.currency||'USD', deadlineDate: fields.deadlineDate||null, revisionsExpected: fields.revisionsExpected||1, referenceUrls: fields.referenceUrls||[], status: 'pending', bids: [], assignedProviderId: null, createdAt: now, updatedAt: now, _local:true }
  jobs.push(job)
  writeAll(jobs)
  return { job, fallback:true }
}

export async function queryJobRequests(filters) {
  try {
    const { data, count } = await listJobRequestsSupabase(filters)
    return { data, count, page: filters.page, pageSize: filters.pageSize }
  } catch {
    let arr = readAll()
    const { status='open', category='all', genre='all', search='', minBudget=0, maxBudget=0, page=1, pageSize=12 } = filters
    if (status !== 'all') arr = arr.filter(j => j.status === status)
    if (category !== 'all') arr = arr.filter(j => j.category === category)
    if (genre !== 'all') arr = arr.filter(j => j.genres.includes(genre))
    if (search) arr = arr.filter(j => j.title.toLowerCase().includes(search.toLowerCase()))
    if (minBudget) arr = arr.filter(j => j.budget >= minBudget)
    if (maxBudget) arr = arr.filter(j => j.budget <= maxBudget)
    const count = arr.length
    const start = (page-1)*pageSize
    const end = start + pageSize
    return { data: arr.slice(start,end), count, page, pageSize, fallback:true }
  }
}

export async function deleteJob(jobId) {
  if (!jobId) return
  try {
    await deleteJobRequestSupabase(jobId)
    return true
  } catch {
    const jobs = readAll().filter(j => j.id !== jobId)
    writeAll(jobs)
    return true
  }
}

export async function getJobRequest(jobId) {
  try { return await getJobRequestSupabase(jobId) } catch { return readAll().find(j => j.id === jobId) || null }
}

export async function addBid(jobId, bidFields) {
  return addBidToJobSupabase(jobId, bidFields)
    .catch(()=> legacyAddBid(jobId, bidFields))
}

function legacyAddBid(jobId, { providerId, amount, message }) {
  const jobs = readAll()
  const idx = jobs.findIndex(j => j.id === jobId)
  if (idx === -1) return { error: 'Not found (local)' }
  const bid = { id: 'bidloc_' + Date.now(), providerId, amount: Number(amount)||0, message: message||'', createdAt: new Date().toISOString(), _local:true }
  jobs[idx].bids.push(bid)
  jobs[idx].updatedAt = new Date().toISOString()
  writeAll(jobs)
  return jobs[idx]
}

export async function updateJobStatus(jobId, status, assignedProviderId=null) {
  return updateJobStatusSupabase(jobId, status, assignedProviderId)
    .catch(()=> legacyUpdateStatus(jobId, status, assignedProviderId))
}

export async function declineBid(jobId, bidId) {
  if (!jobId || !bidId) return null
  try {
    const job = await getJobRequestSupabase(jobId)
    const bids = (job.bids || []).filter(b => b.id !== bidId)
    const updated = await updateJobBidsSupabase(jobId, bids)
    return updated
  } catch {
    return legacyDeclineBid(jobId, bidId)
  }
}

export async function listUserJobRequests(userId) {
  if (!userId) return { data: [], count: 0 }
  try {
    const data = await listJobRequestsByUserSupabase(userId)
    return { data, count: data.length }
  } catch {
    const arr = readAll().filter(j => j.userId === userId)
    return { data: arr, count: arr.length, fallback: true }
  }
}

function legacyUpdateStatus(jobId, status, assignedProviderId) {
  const jobs = readAll()
  const idx = jobs.findIndex(j => j.id === jobId)
  if (idx === -1) return { error: 'Not found (local)' }
  jobs[idx].status = status
  if (assignedProviderId) jobs[idx].assignedProviderId = assignedProviderId
  jobs[idx].updatedAt = new Date().toISOString()
  writeAll(jobs)
  return jobs[idx]
}

function legacyDeclineBid(jobId, bidId) {
  const jobs = readAll()
  const idx = jobs.findIndex(j => j.id === jobId)
  if (idx === -1) return null
  jobs[idx].bids = (jobs[idx].bids || []).filter(b => b.id !== bidId)
  jobs[idx].updatedAt = new Date().toISOString()
  writeAll(jobs)
  return jobs[idx]
}

export async function computeJobStats() {
  try { return await computeJobRequestsStatsSupabase() } catch {
    const jobs = readAll()
    const stats = { open:0, assigned:0, completed:0, cancelled:0, totalBudget:0, fallback:true }
    for (const j of jobs) { if (stats[j.status] !== undefined) stats[j.status]++; stats.totalBudget += Number(j.budget)||0 }
    return stats
  }
}

export function saveJobDelivery(jobId, payload) {
  const deliveries = readDeliveries()
  deliveries[jobId] = { ...payload, updatedAt: new Date().toISOString() }
  writeDeliveries(deliveries)
  return deliveries[jobId]
}

export function getJobDelivery(jobId) {
  const deliveries = readDeliveries()
  return deliveries[jobId] || null
}

export function markJobPaid(jobId) {
  const escrow = readEscrow()
  escrow[jobId] = { ...(escrow[jobId]||{}), paid: true, released: escrow[jobId]?.released || false, updatedAt: new Date().toISOString() }
  writeEscrow(escrow)
  return escrow[jobId]
}

export function releaseJobFunds(jobId) {
  const escrow = readEscrow()
  escrow[jobId] = { ...(escrow[jobId]||{}), paid: true, released: true, updatedAt: new Date().toISOString() }
  writeEscrow(escrow)
  return escrow[jobId]
}

export function getJobEscrow(jobId) {
  const escrow = readEscrow()
  return escrow[jobId] || { paid: false, released: false }
}

export function addJobReview({ jobId, providerId, rating, text }) {
  if (!jobId || !providerId || !rating) return null
  const reviews = readReviews()
  const review = { id: 'rev_' + Date.now(), jobId, providerId, rating: Number(rating), text: text || '', createdAt: new Date().toISOString() }
  reviews.push(review)
  writeReviews(reviews)
  return review
}

export function listProviderReviews(providerId) {
  if (!providerId) return []
  const reviews = readReviews()
  return reviews.filter(r => r.providerId === providerId)
}

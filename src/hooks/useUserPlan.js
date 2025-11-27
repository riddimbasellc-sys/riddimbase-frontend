import { useEffect, useState } from 'react'
import useSupabaseUser from './useSupabaseUser'
import { getUserPlan } from '../services/subscriptionService'

export default function useUserPlan() {
  const { user, loading } = useSupabaseUser()
  const [plan, setPlan] = useState('free')

  useEffect(() => {
    let active = true
    if (!loading && user) {
      ;(async () => {
        const p = await getUserPlan(user.id)
        if (active) setPlan(p || 'free')
      })()
    }
    if (!loading && !user) {
      setPlan('free')
    }
    return () => {
      active = false
    }
  }, [loading, user])

  return { plan, user, loading }
}

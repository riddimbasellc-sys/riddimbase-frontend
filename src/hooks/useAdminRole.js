import useSupabaseUser from './useSupabaseUser'

export function useAdminRole() {
  const { user, loading } = useSupabaseUser()
  const ownerEmail = import.meta.env.VITE_OWNER_EMAIL
  const isAdmin = !!user && user.email === ownerEmail
  return { isAdmin, loading }
}

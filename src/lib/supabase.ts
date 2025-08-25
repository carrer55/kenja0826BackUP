import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are missing')
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// シングルトンパターンでSupabaseクライアントを作成
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
  }
  return supabaseInstance
})()

export default supabase

// 型定義
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  phone: string | null
  position: string | null
  department: string | null
  role: string | null
  default_organization_id: string | null
  avatar_url: string | null
  onboarding_completed: boolean | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  description: string | null
  owner_id: string
  settings: any
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  user_id: string
  organization_id: string | null
  type: 'business_trip' | 'expense'
  title: string
  description: string | null
  data: any
  total_amount: number
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'returned'
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

// 認証関連のヘルパー関数
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Get user error:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('Get user failed:', error)
    return null
  }
}

export const getCurrentUserProfile = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Profile fetch error:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Get user profile failed:', error)
    return null
  }
}

export const createUserProfile = async (userId: string, profileData: Partial<UserProfile>) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: user.email || '',
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Create user profile failed:', error)
    throw error
  }
}

export const updateUserProfile = async (updates: Partial<UserProfile>) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const createOrganization = async (name: string, description?: string) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      description: description || null,
      owner_id: user.id,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  
  // ローカルストレージのクリア
  localStorage.removeItem('userProfile')
  localStorage.removeItem('demoMode')
  localStorage.removeItem('demoSession')
}
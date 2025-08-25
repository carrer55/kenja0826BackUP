import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // デモモードチェック
    const demoMode = localStorage.getItem('demoMode') === 'true'
    if (demoMode) {
      const demoSession = localStorage.getItem('demoSession')
      const demoProfile = localStorage.getItem('userProfile')
      
      if (demoSession && demoProfile) {
        try {
          const sessionData = JSON.parse(demoSession)
          const profileData = JSON.parse(demoProfile)
          setUser(sessionData.user)
          setProfile(profileData)
        } catch (err) {
          console.error('Demo mode data parse error:', err)
          localStorage.removeItem('demoMode')
          localStorage.removeItem('demoSession')
          localStorage.removeItem('userProfile')
        }
      }
      setLoading(false)
      return
    }

    // 通常の認証処理
    const getInitialUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        
        setUser(user)
        
        if (user) {
          await fetchUserProfile(user.id)
        }
      } catch (err) {
        console.error('Initial auth error:', err)
        setError(err instanceof Error ? err.message : 'Auth error')
      } finally {
        setLoading(false)
      }
    }

    getInitialUser()

    // 認証状態変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        setUser(session?.user || null)
        setError(null)
        setLoading(false)

        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // プロファイルが存在しない場合は作成
        await createUserProfile(userId)
        return
      }

      if (error) {
        console.error('Profile fetch error:', error)
        return
      }

      setProfile(profile)
    } catch (err) {
      console.error('Profile fetch failed:', err)
    }
  }

  const createUserProfile = async (userId: string) => {
    try {
      const user = await supabase.auth.getUser()
      const email = user.data.user?.email || ''

      const { data: newProfile, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error && error.code !== '23505') {
        console.error('Profile creation error:', error)
        return
      }

      if (newProfile) {
        setProfile(newProfile)
      }
    } catch (err) {
      console.error('Profile creation failed:', err)
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // デモアカウントの処理
      if (email === 'demo' && password === 'pass9981') {
        const demoProfile: UserProfile = {
          id: 'demo-user-id',
          email: 'demo',
          full_name: 'デモユーザー',
          company_name: '株式会社デモ',
          position: '代表取締役',
          phone: '090-0000-0000',
          department: '経営企画部',
          role: 'admin',
          default_organization_id: null,
          avatar_url: null,
          onboarding_completed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const demoSession = {
          user: {
            id: 'demo-user-id',
            email: 'demo',
            email_confirmed_at: new Date().toISOString()
          }
        }
        
        localStorage.setItem('userProfile', JSON.stringify(demoProfile))
        localStorage.setItem('demoMode', 'true')
        localStorage.setItem('demoSession', JSON.stringify(demoSession))
        
        setUser(demoSession.user as User)
        setProfile(demoProfile)
        setLoading(false)
        return { success: true }
      }

      // 通常のログイン処理
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, profileData?: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: profileData
        }
      })
      
      if (error) throw error
      return { success: true, user: data.user }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // デモモードの場合
      if (localStorage.getItem('demoMode') === 'true') {
        localStorage.removeItem('demoMode')
        localStorage.removeItem('demoSession')
        localStorage.removeItem('userProfile')
        localStorage.removeItem('travelRegulations')
        localStorage.removeItem('notificationSettings')
        localStorage.removeItem('approvalReminderRules')
        localStorage.removeItem('approvalReminderGlobalSettings')
        
        setUser(null)
        setProfile(null)
        setLoading(false)
        return { success: true }
      }

      // 通常のログアウト処理
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // ローカルストレージのクリア
      localStorage.clear()
      
      setUser(null)
      setProfile(null)
      return { success: true }
    } catch (err) {
      console.error('Sign out error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setProfile(data)
      return { success: true, profile: data }
    } catch (err) {
      console.error('Profile update error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update profile' 
      }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/password-reset-confirm`,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
      return { success: false, error: errorMessage }
    }
  }

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    isAuthenticated: !!user
  }
}
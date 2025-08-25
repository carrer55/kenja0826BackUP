import { useEffect, useState, useCallback, useMemo } from 'react'
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

  // 安全なプロファイル作成（重複回避）
  const createUserProfileSafely = useCallback(async (user: User) => {
    try {
      // まず既存プロファイルを確認
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      // プロファイルが存在しない場合のみ作成
      if (!existingProfile && fetchError?.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError && insertError.code !== '23505') {
          // 23505は重複エラー（無視してOK）
          console.warn('Profile creation error:', insertError)
        }
      }
    } catch (err) {
      console.warn('Profile creation failed:', err)
    }
  }, [])

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // プロファイルが存在しない場合は作成
        await createUserProfileSafely({ id: userId, email: user?.email } as User)
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
  }, [createUserProfileSafely, user?.email])

  useEffect(() => {
    let mounted = true

    // デモモードチェック
    const demoMode = localStorage.getItem('demoMode') === 'true'
    if (demoMode) {
      const demoSession = localStorage.getItem('demoSession')
      const demoProfile = localStorage.getItem('userProfile')
      
      if (demoSession && demoProfile) {
        try {
          const sessionData = JSON.parse(demoSession)
          const profileData = JSON.parse(demoProfile)
          if (mounted) {
            setUser(sessionData.user)
            setProfile(profileData)
          }
        } catch (err) {
          console.error('Demo mode data parse error:', err)
          localStorage.removeItem('demoMode')
          localStorage.removeItem('demoSession')
          localStorage.removeItem('userProfile')
        }
      }
      if (mounted) setLoading(false)
      return
    }

    // 通常の認証処理
    const getInitialUser = async () => {
      try {
        console.log('Getting initial user...')
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('Initial user result:', { user: !!user, error })
        if (!mounted) return

        if (error) throw error
        
        setUser(user)
        
        if (user) {
          console.log('Fetching user profile for:', user.id)
          await fetchUserProfile(user.id)
        }
      } catch (err) {
        if (!mounted) return
        console.error('Initial auth error:', err)
        setError(err instanceof Error ? err.message : 'Auth error')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    getInitialUser()

    // 認証状態変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth event:', event)
        console.log('Session:', !!session)
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

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  // メモ化された認証メソッド
  const authMethods = useMemo(() => ({
    signIn: async (email: string, password: string) => {
      setLoading(true)
      setError(null)
      
      try {
        // デモアカウントの処理
        if (email === 'demo' && password === 'pass9981') {
          try {
            // デモユーザーのプロフィール情報をローカルストレージに設定
            const demoProfile = {
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
            };
            
            localStorage.setItem('userProfile', JSON.stringify(demoProfile));
            localStorage.setItem('demoMode', 'true');
            
            // 認証状態をシミュレート
            const demoSession = {
              user: {
                id: 'demo-user-id',
                email: 'demo',
                email_confirmed_at: new Date().toISOString()
              }
            };
            
            localStorage.setItem('demoSession', JSON.stringify(demoSession));
            
            setUser(demoSession.user as User);
            setProfile(demoProfile);
            
            return { success: true };
          } catch (err) {
            console.error('Demo login error:', err);
            return { success: false, error: 'デモログインに失敗しました' };
          }
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
    },

    signUp: async (email: string, password: string, profileData?: any) => {
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
    },

    signOut: async () => {
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
    },

    updateProfile: async (updates: Partial<UserProfile>) => {
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
    },

    resetPassword: async (email: string) => {
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
  }), [user])

  return {
    user,
    profile,
    loading,
    error,
    ...authMethods,
    isAuthenticated: !!user
  }
}
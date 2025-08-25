import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, UserProfile, getCurrentUserProfile } from '../lib/supabase';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        // デモモードのチェック
        const demoMode = localStorage.getItem('demoMode');
        const demoSession = localStorage.getItem('demoSession');
        
        if (demoMode === 'true' && demoSession) {
          try {
            const session = JSON.parse(demoSession);
            const demoProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
            
            if (mounted) {
              setAuthState({
                user: session.user,
                profile: demoProfile,
                loading: false,
                error: null
              });
            }
            return;
          } catch (error) {
            console.error('Demo session parse error:', error);
            localStorage.removeItem('demoMode');
            localStorage.removeItem('demoSession');
            localStorage.removeItem('userProfile');
          }
        }

        // 通常の認証チェック
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setAuthState({
              user: null,
              profile: null,
              loading: false,
              error: null // エラーを表示せずに未認証状態にする
            });
          }
          return;
        }

        if (session?.user) {
          try {
            const profile = await getCurrentUserProfile();
            
            if (mounted) {
              setAuthState({
                user: session.user,
                profile,
                loading: false,
                error: null
              });
            }
          } catch (profileError) {
            console.error('Profile fetch error:', profileError);
            if (mounted) {
              setAuthState({
                user: session.user,
                profile: null,
                loading: false,
                error: null
              });
            }
          }
        } else {
          if (mounted) {
            setAuthState({
              user: null,
              profile: null,
              loading: false,
              error: null
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null
          });
        }
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const profile = await getCurrentUserProfile();
            setAuthState({
              user: session.user,
              profile,
              loading: false,
              error: null
            });
          } catch (error) {
            console.error('Profile fetch on sign in error:', error);
            setAuthState({
              user: session.user,
              profile: null,
              loading: false,
              error: null
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null
          });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          try {
            const profile = await getCurrentUserProfile();
            setAuthState(prev => ({
              ...prev,
              user: session.user,
              profile,
              error: null
            }));
          } catch (error) {
            console.error('Profile fetch on token refresh error:', error);
            setAuthState(prev => ({
              ...prev,
              user: session.user,
              error: null
            }));
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      if (data.user) {
        try {
          const profile = await getCurrentUserProfile();
          setAuthState({
            user: data.user,
            profile,
            loading: false,
            error: null
          });
          return { success: true, user: data.user, profile };
        } catch (profileError) {
          console.error('Profile fetch error after sign in:', profileError);
          setAuthState({
            user: data.user,
            profile: null,
            loading: false,
            error: null
          });
          return { success: true, user: data.user, profile: null };
        }
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, profileData?: {
    full_name: string;
    company_name: string;
    position: string;
    phone: string;
  }) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
          data: profileData ? {
            full_name: profileData.full_name,
            company_name: profileData.company_name,
            position: profileData.position,
            phone: profileData.phone
          } : undefined
        }
      });

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      setAuthState(prev => ({ ...prev, loading: false }));
      return { success: true, user: data.user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      // デモモードの場合
      if (localStorage.getItem('demoMode') === 'true') {
        localStorage.removeItem('demoMode');
        localStorage.removeItem('demoSession');
        localStorage.removeItem('userProfile');
        setAuthState({
          user: null,
          profile: null,
          loading: false,
          error: null
        });
        return { success: true };
      }

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      // ローカルストレージのクリア
      localStorage.removeItem('userProfile');
      
      setAuthState({
        user: null,
        profile: null,
        loading: false,
        error: null
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      if (!authState.user) {
        throw new Error('User not authenticated');
      }

      // プロフィールの作成または更新
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: authState.user.id,
          email: authState.user.email || '',
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      setAuthState(prev => ({
        ...prev,
        profile: data,
        loading: false,
        error: null
      }));

      return { success: true, profile: data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      return { success: false, error: errorMessage };
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    isAuthenticated: !!authState.user,
    isEmailConfirmed: !!authState.user?.email_confirmed_at || localStorage.getItem('demoMode') === 'true',
    isOnboardingCompleted: !!authState.profile?.onboarding_completed || localStorage.getItem('demoMode') === 'true'
  };
}
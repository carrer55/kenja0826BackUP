import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xhlunauofzuinzhxgqti.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobHVuYXVvZnp1aW56aHhncXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NDc0MzYsImV4cCI6MjA3MTMyMzQzNn0.W2aKboc8i4ObqVM8QlLwqAvUXI2D1dg6jVP14QFXawU'
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobHVuYXVvZnp1aW56aHhncXRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTc0NzQzNiwiZXhwIjoyMDcxMzIzNDM2fQ.f3JBLtmRZbySWi28G9inB8qLhhlOglKLaAgQtqsfa0o'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
})

// Service role client for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
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

export interface ExpenseItem {
  id: string
  application_id: string
  category_id: string | null
  date: string
  amount: number
  description: string | null
  receipt_url: string | null
  receipt_metadata: any
  is_approved: boolean | null
  created_at: string
  updated_at: string
}

export interface BusinessTripDetail {
  id: string
  application_id: string
  destination_id: string | null
  start_date: string
  end_date: string
  purpose: string
  participants: string | null
  estimated_daily_allowance: number | null
  estimated_transportation: number | null
  estimated_accommodation: number | null
  actual_daily_allowance: number | null
  actual_transportation: number | null
  actual_accommodation: number | null
  report_submitted: boolean | null
  report_content: string | null
  created_at: string
  updated_at: string
}

// 認証関連のヘルパー関数
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get user error:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Get user failed:', error);
    return null;
  }
};

export const getCurrentUserProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Get user profile failed:', error);
    return null;
  }
};

export const createUserProfile = async (userId: string, profileData: Partial<UserProfile>) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

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
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Create user profile failed:', error);
    throw error;
  }
};

export const updateUserProfile = async (updates: Partial<UserProfile>) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createOrganization = async (name: string, description?: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

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
    .single();

  if (error) throw error;
  return data;
};

export const getUserOrganizations = async () => {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      role,
      organizations (
        id,
        name,
        description,
        owner_id,
        settings
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    console.error('Get user organizations error:', error);
    return [];
  }

  return data?.map(item => ({
    ...item.organizations,
    member_role: item.role
  })) || [];
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  
  // ローカルストレージのクリア
  localStorage.removeItem('userProfile');
  localStorage.removeItem('demoMode');
  localStorage.removeItem('demoSession');
};
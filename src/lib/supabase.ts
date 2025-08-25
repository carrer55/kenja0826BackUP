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
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public'
      },
      // リアルタイム機能を無効化してパフォーマンス改善
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  }
  return supabaseInstance
})()

export default supabase

// 型定義
export interface UserProfile {
  id: string
  email: string | null
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

export interface BusinessTripDetail {
  id: string
  application_id: string
  destination_id: string | null
  start_date: string
  end_date: string
  purpose: string
  participants: string | null
  estimated_daily_allowance: number
  estimated_transportation: number
  estimated_accommodation: number
  actual_daily_allowance: number
  actual_transportation: number
  actual_accommodation: number
  report_submitted: boolean
  report_content: string | null
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
  is_approved: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  organization_id: string | null
  application_id: string | null
  type: 'business_report' | 'allowance_detail' | 'expense_settlement' | 'travel_detail' | 'gps_log' | 'monthly_report' | 'annual_report'
  title: string
  content: any
  file_url: string | null
  file_size: number | null
  mime_type: string | null
  status: 'draft' | 'submitted' | 'approved' | 'completed'
  created_at: string
  updated_at: string
}

export interface TravelRegulation {
  id: string
  organization_id: string | null
  name: string
  version: string
  company_info: any
  articles: any
  allowance_settings: any
  status: 'draft' | 'active' | 'archived'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'approval' | 'reminder' | 'system' | 'update'
  title: string
  message: string
  data: any
  read: boolean
  read_at: string | null
  created_at: string
}

export interface AccountingService {
  id: string
  organization_id: string
  service_name: string
  connected: boolean
  last_sync: string | null
  status: 'active' | 'error' | 'disconnected'
  api_version: string
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface ReminderRule {
  id: string
  organization_id: string
  name: string
  enabled: boolean
  trigger_days: number
  repeat_interval: number
  target_roles: string[]
  notification_methods: string[]
  custom_message: string
  created_at: string
  updated_at: string
}
// 安全なプロフィール作成（重複回避）
export const createUserProfileSafely = async (user: any) => {
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
        console.error('Profile creation error:', insertError)
      }
    }
  } catch (err) {
    console.error('Profile creation failed:', err)
  }
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

// 申請関連のヘルパー関数
export const getApplications = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        business_trip_details(*),
        expense_items(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get applications failed:', error)
    return []
  }
}

export const createApplication = async (
  type: 'business_trip' | 'expense',
  title: string,
  data: any,
  userId: string
) => {
  try {
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        type,
        title,
        description: data.description || null,
        data,
        total_amount: calculateTotalAmount(type, data),
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error

    // 出張申請の場合は詳細テーブルにも挿入
    if (type === 'business_trip' && data.tripDetails) {
      const { error: tripError } = await supabase
        .from('business_trip_details')
        .insert({
          application_id: application.id,
          start_date: data.tripDetails.startDate,
          end_date: data.tripDetails.endDate,
          purpose: data.tripDetails.purpose,
          participants: data.tripDetails.participants,
          estimated_daily_allowance: data.tripDetails.estimatedDailyAllowance,
          estimated_transportation: data.tripDetails.estimatedTransportation,
          estimated_accommodation: data.tripDetails.estimatedAccommodation
        })

      if (tripError) throw tripError
    }

    // 経費申請の場合は経費項目テーブルにも挿入
    if (type === 'expense' && data.expenseItems) {
      const expenseItems = data.expenseItems.map((item: any) => ({
        application_id: application.id,
        date: item.date,
        amount: item.amount,
        description: item.description
      }))

      const { error: expenseError } = await supabase
        .from('expense_items')
        .insert(expenseItems)

      if (expenseError) throw expenseError
    }

    return { success: true, application }
  } catch (error) {
    console.error('Create application failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create application' }
  }
}

// 書類関連のヘルパー関数
export const getDocuments = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get documents failed:', error)
    return []
  }
}

export const createDocument = async (
  type: string,
  title: string,
  content: any,
  userId: string
) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        type,
        title,
        content,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, document: data }
  } catch (error) {
    console.error('Create document failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create document' }
  }
}

// 出張規程関連のヘルパー関数
export const getTravelRegulations = async (organizationId?: string) => {
  try {
    let query = supabase
      .from('travel_regulations')
      .select('*')
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  } catch (error) {
    console.error('Get travel regulations failed:', error)
    return []
  }
}

export const createTravelRegulation = async (
  name: string,
  companyInfo: any,
  articles: any,
  allowanceSettings: any,
  userId: string,
  organizationId?: string
) => {
  try {
    const { data, error } = await supabase
      .from('travel_regulations')
      .insert({
        organization_id: organizationId,
        name,
        version: 'v1.0',
        company_info: companyInfo,
        articles,
        allowance_settings: allowanceSettings,
        status: 'draft',
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, regulation: data }
  } catch (error) {
    console.error('Create travel regulation failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create travel regulation' }
  }
}

// 通知関連のヘルパー関数
export const getNotifications = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get notifications failed:', error)
    return []
  }
}

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Mark notification as read failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to mark as read' }
  }
}

// 分析データ取得関数
export const getAnalytics = async (
  organizationId: string,
  dateRange?: { start: string, end: string },
  metrics?: string[],
  groupBy?: string
) => {
  try {
    // 基本的な集計クエリ
    let query = supabase
      .from('applications')
      .select(`
        id,
        type,
        total_amount,
        status,
        created_at,
        user_profiles!inner(department)
      `)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
    }

    const { data, error } = await query
    if (error) throw error

    // フロントエンドで集計処理
    const analytics = {
      summary: {
        monthlyTotal: data?.reduce((sum, app) => sum + app.total_amount, 0) || 0,
        monthlyCount: data?.length || 0,
        pendingCount: data?.filter(app => app.status === 'pending').length || 0,
        approvedCount: data?.filter(app => app.status === 'approved').length || 0,
        averageAmount: data?.length ? (data.reduce((sum, app) => sum + app.total_amount, 0) / data.length) : 0
      },
      trends: {
        monthly: {} // 月次トレンドデータ
      },
      breakdowns: {
        byDepartment: {} // 部署別内訳
      },
      generatedAt: new Date().toISOString()
    }

    return analytics
  } catch (error) {
    console.error('Get analytics failed:', error)
    throw error
  }
}

// ファイルアップロード関連
export const uploadFile = async (
  bucket: 'receipts' | 'documents' | 'attachments',
  file: File,
  userId: string,
  path?: string
) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    const filePath = path || fileName

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return { success: true, path: filePath, url: publicUrl }
  } catch (error) {
    console.error('File upload failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to upload file' }
  }
}

// 金額計算ヘルパー関数
function calculateTotalAmount(type: string, data: any): number {
  if (type === 'business_trip' && data.tripDetails) {
    const { estimatedDailyAllowance = 0, estimatedTransportation = 0, estimatedAccommodation = 0 } = data.tripDetails
    return estimatedDailyAllowance + estimatedTransportation + estimatedAccommodation
  }
  
  if (type === 'expense' && data.expenseItems) {
    return data.expenseItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
  }
  
  return 0
}
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  
  // ローカルストレージのクリア
  localStorage.removeItem('userProfile')
  localStorage.removeItem('demoMode')
  localStorage.removeItem('demoSession')
}
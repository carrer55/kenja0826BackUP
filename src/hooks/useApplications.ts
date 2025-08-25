import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

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
  
  // リレーション
  user_profiles?: {
    full_name: string
    department: string
    position: string
  }
  organizations?: {
    name: string
  }
  expense_items?: Array<{
    id: string
    category_id: string | null
    date: string
    amount: number
    description: string | null
    receipt_url: string | null
  }>
  business_trip_details?: Array<{
    id: string
    start_date: string
    end_date: string
    purpose: string
    estimated_daily_allowance: number
    estimated_transportation: number
    estimated_accommodation: number
  }>
}

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, profile } = useAuth()

  useEffect(() => {
    if (user && profile) {
      fetchApplications()
    } else {
      // デモモードの場合はサンプルデータを表示
      if (localStorage.getItem('demoMode') === 'true') {
        setApplications([
          {
            id: 'demo-app-1',
            user_id: 'demo-user-id',
            organization_id: null,
            type: 'business_trip',
            title: '東京出張申請',
            description: 'クライアント訪問',
            data: {},
            total_amount: 52500,
            status: 'approved',
            submitted_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: null,
            rejection_reason: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
      }
    }
  }, [user, profile])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setApplications([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from('applications')
        .select(`
          *,
          user_profiles (
            full_name,
            department,
            position
          ),
          organizations (
            name
          ),
          expense_items (*),
          business_trip_details (*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Applications fetch error:', fetchError)
        throw fetchError
      }

      setApplications(data || [])
    } catch (err) {
      console.error('Applications fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch applications')
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  const createApplication = async (
    type: 'business_trip' | 'expense',
    title: string,
    data: any
  ) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      // 組織IDを取得または作成
      let organizationId = profile?.default_organization_id
      
      if (!organizationId && profile?.company_name) {
        try {
          const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: profile.company_name,
              owner_id: user.id,
              description: `${profile.company_name}の組織`
            })
            .select()
            .single()

          if (!orgError && newOrg) {
            organizationId = newOrg.id
            
            // プロフィールに組織IDを設定
            await supabase
              .from('user_profiles')
              .update({ default_organization_id: organizationId })
              .eq('id', user.id)
          }
        } catch (orgError) {
          console.error('Organization creation error:', orgError)
        }
      }

      const { data: newApp, error: createError } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          type,
          title,
          description: data.description || null,
          data,
          total_amount: calculateTotalAmount(type, data),
          status: 'draft'
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // 出張申請の場合、詳細データを作成
      if (type === 'business_trip' && data.tripDetails) {
        const { error: tripError } = await supabase
          .from('business_trip_details')
          .insert({
            application_id: newApp.id,
            start_date: data.tripDetails.startDate,
            end_date: data.tripDetails.endDate,
            purpose: data.tripDetails.purpose,
            participants: data.tripDetails.participants,
            estimated_daily_allowance: data.tripDetails.estimatedDailyAllowance || 0,
            estimated_transportation: data.tripDetails.estimatedTransportation || 0,
            estimated_accommodation: data.tripDetails.estimatedAccommodation || 0
          })

        if (tripError) {
          console.error('Trip details creation error:', tripError)
        }
      }

      // 経費申請の場合、経費項目を作成
      if (type === 'expense' && data.expenseItems) {
        const expenseItems = data.expenseItems.map((item: any) => ({
          application_id: newApp.id,
          date: item.date,
          amount: item.amount,
          description: item.description,
          category_id: null // カテゴリIDは後で実装
        }))

        const { error: expenseError } = await supabase
          .from('expense_items')
          .insert(expenseItems)

        if (expenseError) {
          console.error('Expense items creation error:', expenseError)
        }
      }

      await fetchApplications()
      return { success: true, application: newApp }
    } catch (err) {
      console.error('Application creation error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create application' 
      }
    }
  }

  const updateApplication = async (id: string, updates: Partial<Application>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('applications')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      await fetchApplications()
      return { success: true, application: data }
    } catch (err) {
      console.error('Application update error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update application' 
      }
    }
  }

  const submitApplication = async (id: string) => {
    try {
      const { data, error: submitError } = await supabase
        .from('applications')
        .update({ 
          status: 'pending', 
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (submitError) {
        throw submitError
      }

      await fetchApplications()
      return { success: true, application: data }
    } catch (err) {
      console.error('Application submission error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to submit application' 
      }
    }
  }

  const deleteApplication = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      await fetchApplications()
      return { success: true }
    } catch (err) {
      console.error('Application deletion error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete application' 
      }
    }
  }

  const handleApproval = async (
    applicationId: string,
    action: 'approved' | 'rejected' | 'returned',
    comment?: string
  ) => {
    try {
      const updates: any = {
        status: action,
        updated_at: new Date().toISOString()
      }

      if (action === 'approved') {
        updates.approved_at = new Date().toISOString()
        updates.approved_by = user?.id
      } else if (action === 'rejected' || action === 'returned') {
        updates.rejection_reason = comment
      }

      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', applicationId)
        .select()
        .single()

      if (error) {
        throw error
      }

      await fetchApplications()
      return { success: true, result: data }
    } catch (err) {
      console.error('Approval error:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to process approval' 
      }
    }
  }

  return {
    applications,
    loading,
    error,
    createApplication,
    updateApplication,
    submitApplication,
    deleteApplication,
    handleApproval,
    refreshApplications: fetchApplications
  }
}

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
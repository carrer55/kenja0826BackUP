import { useState } from 'react'
import { uploadFile } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const uploadReceipt = async (file: File) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      setUploading(true)
      setError(null)

      const result = await uploadFile('receipts', file, user.id)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload receipt'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUploading(false)
    }
  }

  const uploadDocument = async (file: File) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      setUploading(true)
      setError(null)

      const result = await uploadFile('documents', file, user.id)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUploading(false)
    }
  }

  const uploadAttachment = async (file: File) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      setUploading(true)
      setError(null)

      const result = await uploadFile('attachments', file, user.id)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload attachment'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUploading(false)
    }
  }

  return {
    uploading,
    error,
    uploadReceipt,
    uploadDocument,
    uploadAttachment
  }
}
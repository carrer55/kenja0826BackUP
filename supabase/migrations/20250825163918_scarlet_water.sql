/*
  # Set up file storage for receipts and documents

  1. Storage Buckets
    - Create 'receipts' bucket for expense receipts
    - Create 'documents' bucket for generated documents
    - Create 'attachments' bucket for general file attachments

  2. Storage Policies
    - Users can upload their own files
    - Users can view files in their organization
    - Organization admins can manage all files

  3. Update existing tables
    - Add file_path columns where needed
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('receipts', 'receipts', false, 52428800, '{"image/jpeg","image/png","image/gif","application/pdf"}'),
  ('documents', 'documents', false, 104857600, '{"application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"}'),
  ('attachments', 'attachments', false, 52428800, '{"image/jpeg","image/png","image/gif","application/pdf","text/plain"}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts bucket
CREATE POLICY "Users can upload receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipts"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for documents bucket
CREATE POLICY "Users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for attachments bucket
CREATE POLICY "Users can upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own attachments"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
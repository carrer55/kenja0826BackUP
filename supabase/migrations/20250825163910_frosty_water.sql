/*
  # Create accounting services tables

  1. New Tables
    - `accounting_services`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `service_name` (text)
      - `connected` (boolean)
      - `last_sync` (timestamp)
      - `status` (text)
      - `api_version` (text)
      - `permissions` (text array)
      - `access_token` (text, encrypted)
      - `refresh_token` (text, encrypted)
      - `token_expires_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for organization members
*/

CREATE TABLE IF NOT EXISTS accounting_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  connected boolean DEFAULT false,
  last_sync timestamptz,
  status text DEFAULT 'disconnected' CHECK (status IN ('active', 'error', 'disconnected')),
  api_version text DEFAULT 'v1.0',
  permissions text[] DEFAULT '{}',
  access_token text, -- 実際の実装では暗号化が必要
  refresh_token text, -- 実際の実装では暗号化が必要
  token_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE accounting_services ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounting_services_org ON accounting_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounting_services_status ON accounting_services(status);

-- RLS Policies
CREATE POLICY "Organization admins can manage accounting services"
  ON accounting_services
  FOR ALL
  TO public
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can view accounting services in their organization"
  ON accounting_services
  FOR SELECT
  TO public
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = uid()
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_accounting_services_updated_at
  BEFORE UPDATE ON accounting_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
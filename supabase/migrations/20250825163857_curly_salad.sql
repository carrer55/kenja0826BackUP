/*
  # Create reminder settings tables

  1. New Tables
    - `reminder_rules`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `name` (text)
      - `enabled` (boolean)
      - `trigger_days` (integer)
      - `repeat_interval` (integer)
      - `target_roles` (text array)
      - `notification_methods` (text array)
      - `custom_message` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `reminder_global_settings`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `enabled` (boolean)
      - `business_hours_only` (boolean)
      - `start_time` (time)
      - `end_time` (time)
      - `exclude_weekends` (boolean)
      - `exclude_holidays` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for organization members
*/

CREATE TABLE IF NOT EXISTS reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  enabled boolean DEFAULT true,
  trigger_days integer NOT NULL DEFAULT 7,
  repeat_interval integer DEFAULT 0,
  target_roles text[] DEFAULT '{}',
  notification_methods text[] DEFAULT '{"email"}',
  custom_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminder_global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  business_hours_only boolean DEFAULT true,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '18:00',
  exclude_weekends boolean DEFAULT true,
  exclude_holidays boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_global_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reminder_rules_org ON reminder_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminder_global_settings_org ON reminder_global_settings(organization_id);

-- RLS Policies for reminder_rules
CREATE POLICY "Organization admins can manage reminder rules"
  ON reminder_rules
  FOR ALL
  TO public
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can view reminder rules in their organization"
  ON reminder_rules
  FOR SELECT
  TO public
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = uid()
  ));

-- RLS Policies for reminder_global_settings
CREATE POLICY "Organization admins can manage reminder global settings"
  ON reminder_global_settings
  FOR ALL
  TO public
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can view reminder global settings in their organization"
  ON reminder_global_settings
  FOR SELECT
  TO public
  USING (organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = uid()
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_reminder_rules_updated_at
  BEFORE UPDATE ON reminder_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_global_settings_updated_at
  BEFORE UPDATE ON reminder_global_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
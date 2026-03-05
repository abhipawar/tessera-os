-- Migration: seed_resend_tool
-- Description: Inserts Resend Outbound Email into the global catalog.

-- Ensure the 'Developer Tools' category exists first
DO $$
DECLARE
    v_type_id uuid;
    v_category_id uuid;
BEGIN
    SELECT id INTO v_type_id FROM public.tool_types WHERE slug = 'webhook' LIMIT 1;
    IF NOT FOUND THEN
        SELECT id INTO v_type_id FROM public.tool_types LIMIT 1;
    END IF;

    SELECT id INTO v_category_id FROM public.tool_categories WHERE slug = 'developer-tools' LIMIT 1;
    IF NOT FOUND THEN
        SELECT id INTO v_category_id FROM public.tool_categories LIMIT 1;
    END IF;

    -- Insert Resend Tool
    IF NOT EXISTS (SELECT 1 FROM public.global_tools WHERE name = 'Resend') THEN
        INSERT INTO public.global_tools (name, description, logo_icon, config_schema, type_id, category_id, is_active)
        VALUES (
            'Resend',
            'Send outbound emails directly from your AI Agents using your own Resend domain. Essential for email automation sequences and outreach.',
            'Mail', -- Lucide icon
            '{
                "type": "object",
                "required": ["api_key"],
                "properties": {
                    "api_key": {
                        "type": "string",
                        "title": "Resend API Key",
                        "description": "Your Resend API Key (e.g. re_123456789)"
                    }
                }
            }'::jsonb,
            v_type_id,
            v_category_id,
            true
        );
    END IF;

END $$;

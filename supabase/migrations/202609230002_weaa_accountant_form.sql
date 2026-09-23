-- Add the accountant form to existing CMS content without replacing edited forms.
-- When joinForms is absent, the application seed supplies all default forms.
update public.cms_content
set content = jsonb_set(
      content,
      '{joinForms}',
      (content->'joinForms') || '[
        {
          "slug": "join-accountant",
          "title": "إذا كنت محاسبًا",
          "description": "قدّم بياناتك وخبرتك وسيرتك الذاتية للانضمام إلى فريق وعاء.",
          "audience": "المحاسبون",
          "kind": "join",
          "enabled": true,
          "fields": [
            {"key": "name", "label": "الاسم الكامل", "type": "text", "required": true, "options": []},
            {"key": "phone", "label": "رقم الجوال", "type": "phone", "required": true, "options": []},
            {"key": "email", "label": "البريد الإلكتروني", "type": "email", "required": true, "options": []},
            {"key": "experience", "label": "الخبرة المحاسبية", "type": "multiline", "required": true, "options": []},
            {"key": "cv", "label": "السيرة الذاتية", "type": "file", "required": true, "options": []}
          ]
        }
      ]'::jsonb,
      true
    ) || '{"accountantFormMigrated": true}'::jsonb,
    updated_at = now()
where id = 'main'
  and jsonb_typeof(content->'joinForms') = 'array'
  and content->>'accountantFormMigrated' is distinct from 'true'
  and not exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(content->'joinForms') = 'array' then content->'joinForms'
        else '[]'::jsonb
      end
    ) as form
    where form->>'slug' = 'join-accountant'
  );

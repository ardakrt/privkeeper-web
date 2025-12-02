alter table notes add column if not exists attachments jsonb default '[]'::jsonb;

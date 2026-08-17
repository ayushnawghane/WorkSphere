-- Supabase already ships pgcrypto enabled in most projects, but this keeps
-- gen_random_uuid() available regardless of project defaults.
create extension if not exists "pgcrypto";

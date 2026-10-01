import { createClient } from '@supabase/supabase-js';

// Essas variáveis de ambiente deverão ser configuradas no arquivo .env na raiz do projeto
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

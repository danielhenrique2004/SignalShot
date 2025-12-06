import { createClient } from '@supabase/supabase-js';

// Validar variáveis de ambiente no cliente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Criar cliente apenas se as variáveis estiverem configuradas
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Analysis = {
  id: string;
  user_id: string;
  image_url: string;
  action: 'COMPRAR' | 'VENDER' | 'AGUARDAR';
  confidence: number;
  reasoning: string;
  indicators: {
    trend: string;
    support: string;
    resistance: string;
    volume: string;
  };
  created_at: string;
};

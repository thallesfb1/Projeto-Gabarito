import { supabase } from '../lib/supabase';
import { SimuladoData } from '../types';

/**
 * Busca todas as provas do usuário logado no Supabase.
 */
export async function fetchProvasFromSupabase(userId: string): Promise<SimuladoData[]> {
  try {
    const { data, error } = await supabase
      .from('provas')
      .select('data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) return [];

    return data.map(row => row.data as SimuladoData);
  } catch (error) {
    console.error('Erro ao buscar provas do Supabase:', error);
    return [];
  }
}

/**
 * Salva ou atualiza uma prova específica no Supabase.
 */
export async function saveProvaToSupabase(userId: string, prova: SimuladoData): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('provas')
      .upsert({
        id: prova.id, // Garante que a prova mantenha o mesmo ID
        user_id: userId,
        title: prova.title,
        updated_at: new Date().toISOString(),
        data: prova // Salva todo o objeto JSON na coluna data
      }, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao salvar prova no Supabase:', error);
    return false;
  }
}

/**
 * Deleta uma prova específica do Supabase.
 */
export async function deleteProvaFromSupabase(userId: string, provaId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('provas')
      .delete()
      .eq('user_id', userId)
      .eq('id', provaId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar prova no Supabase:', error);
    return false;
  }
}

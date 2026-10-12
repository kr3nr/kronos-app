import { createClient } from '@supabase/supabase-js';

// Reemplaza estos valores con la URL y la llave pública (anon key) 
// que copiaste desde el panel de configuración de tu proyecto kronos en Supabase
const SUPABASE_URL = 'https://nrwfszpxnrelzajffhhj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yGxZQtku3Ebp4I1XWuGgYg_BAuy4Q4K';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
import { supabase } from './supabase';

export const DEFAULT_CATEGORIES = [
  // --- EGRESOS ---
  { name: 'Casa', type: 'egresos', color: '#3b82f6', parent_id: null, icon: 'home-outline' },
  { name: 'Internet y Teléfono', type: 'egresos', color: '#3b82f6', parent_id: 'Casa', icon: 'wifi-outline' },
  { name: 'Servicios Básicos', type: 'egresos', color: '#3b82f6', parent_id: 'Casa', icon: 'flash-outline' },

  { name: 'Alimentación', type: 'egresos', color: '#f97316', parent_id: null, icon: 'restaurant-outline' },
  { name: 'Mercado', type: 'egresos', color: '#f97316', parent_id: 'Alimentación', icon: 'cart-outline' },
  { name: 'Delivery', type: 'egresos', color: '#f97316', parent_id: 'Alimentación', icon: 'bicycle-outline' },
  { name: 'Snacks', type: 'egresos', color: '#f97316', parent_id: 'Alimentación', icon: 'fast-food-outline' },
  { name: 'Café y Bebidas', type: 'egresos', color: '#f97316', parent_id: 'Alimentación', icon: 'cafe-outline' },

  { name: 'Transporte', type: 'egresos', color: '#8b5cf6', parent_id: null, icon: 'car-outline' },
  { name: 'Taxis', type: 'egresos', color: '#8b5cf6', parent_id: 'Transporte', icon: 'car-sport-outline' },
  { name: 'Mantenimiento', type: 'egresos', color: '#8b5cf6', parent_id: 'Transporte', icon: 'construct-outline' },

  { name: 'Salud', type: 'egresos', color: '#ef4444', parent_id: null, icon: 'heart-outline' },
  { name: 'Farmacia', type: 'egresos', color: '#ef4444', parent_id: 'Salud', icon: 'medical-outline' },

  { name: 'Bienestar', type: 'egresos', color: '#10b981', parent_id: null, icon: 'leaf-outline' },
  { name: 'Aseo Personal', type: 'egresos', color: '#10b981', parent_id: 'Bienestar', icon: 'body-outline' },

  { name: 'Entretenimiento', type: 'egresos', color: '#eab308', parent_id: null, icon: 'film-outline' },
  { name: 'Suscripciones', type: 'egresos', color: '#eab308', parent_id: 'Entretenimiento', icon: 'tv-outline' },
  { name: 'Videojuegos', type: 'egresos', color: '#eab308', parent_id: 'Entretenimiento', icon: 'game-controller-outline' },

  { name: 'Mascota', type: 'egresos', color: '#ec4899', parent_id: null, icon: 'paw-outline' },
  { name: 'Préstamos otorgados', type: 'egresos', color: '#06b6d4', parent_id: null, icon: 'cash-outline' },
  { name: 'Pago de deuda', type: 'egresos', color: '#64748b', parent_id: null, icon: 'card-outline' },
  { name: 'Comisiones bancarias', type: 'egresos', color: '#a3e635', parent_id: null, icon: 'receipt-outline' },

  // --- INGRESOS ---
  { name: 'Salario', type: 'ingresos', color: '#22c55e', parent_id: null, icon: 'cash-outline' },
  { name: 'Freelance', type: 'ingresos', color: '#38bdf8', parent_id: null, icon: 'laptop-outline' },
  { name: 'Inversiones', type: 'ingresos', color: '#c084fc', parent_id: null, icon: 'trending-up-outline' },
  { name: 'Alquileres', type: 'ingresos', color: '#fbbf24', parent_id: null, icon: 'business-outline' },
  { name: 'Ventas', type: 'ingresos', color: '#f472b6', parent_id: null, icon: 'storefront-outline' },
  { name: 'Otros ingresos', type: 'ingresos', color: '#818cf8', parent_id: null, icon: 'wallet-outline' },
  { name: 'Cobro de deuda', type: 'ingresos', color: '#34d399', parent_id: null, icon: 'checkmark-circle-outline' },
  { name: 'Préstamo recibido', type: 'ingresos', color: '#fb923c', parent_id: null, icon: 'arrow-down-circle-outline' }
];

/**
 * Obtiene las categorías del usuario o las inicializa con las predeterminadas si está vacío.
 */
export const getUserCategoriesService = async (userId) => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    if (data && data.length > 0) {
      return data;
    } else {
      return await initializeDefaultCategories(userId);
    }
  } catch (err) {
    console.error('Error al obtener categorías:', err.message);
    return [];
  }
};

/**
 * Inserta las categorías predeterminadas manejando las relaciones de las subcategorías con UUIDs reales.
 */
export const initializeDefaultCategories = async (userId) => {
  try {
    const parentMap = {}; 
    const insertedCategories = [];

    const parents = DEFAULT_CATEGORIES.filter(c => c.parent_id === null);
    for (const cat of parents) {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          user_id: userId,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          icon: cat.icon,
          parent_id: null,
          is_default: true
        }])
        .select()
        .single();

      if (!error && data) {
        parentMap[cat.name] = data.id; 
        insertedCategories.push(data);
      }
    }

    const subcategories = DEFAULT_CATEGORIES.filter(c => c.parent_id !== null);
    for (const sub of subcategories) {
      const realParentUuid = parentMap[sub.parent_id] || null;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          user_id: userId,
          name: sub.name,
          type: sub.type,
          color: sub.color,
          icon: sub.icon,
          parent_id: realParentUuid,
          is_default: true
        }])
        .select()
        .single();

      if (!error && data) {
        insertedCategories.push(data);
      }
    }

    return insertedCategories;
  } catch (err) {
    console.error('Error al inicializar categorías por defecto:', err.message);
    return [];
  }
};

/**
 * Crea una nueva categoría o subcategoría personalizada respetando el tipo (egresos o ingresos).
 */
export const createCategoryService = async (userId, categoryData) => {
  if (!userId) return { data: null, error: 'Usuario no autenticado' };

  try {
    let finalParentId = categoryData.parent_id || null;
    const targetType = categoryData.type || 'egresos'; // Captura explícitamente si es 'ingresos' o 'egresos'

    // Si el parent_id es un texto temporal o viene el nombre del padre, buscamos su UUID real
    if (finalParentId && String(finalParentId).startsWith('c_')) {
      const { data: existingParent } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('name', categoryData.parentName || '')
        .eq('type', targetType) // Buscamos estrictamente dentro del mismo tipo (ingresos o egresos)
        .is('parent_id', null)
        .maybeSingle();

      if (existingParent) {
        finalParentId = existingParent.id;
      } else {
        // Si no existe, creamos la categoría principal asegurando que tenga el tipo correcto
        const { data: newParent, error: parentErr } = await supabase
          .from('categories')
          .insert([{
            user_id: userId,
            name: categoryData.parentName,
            type: targetType, // <--- Aquí aseguramos que el padre sea del tipo correcto (ingresos)
            parent_id: null,
            icon: categoryData.parentIcon || 'folder-outline',
            color: categoryData.color || '#3b82f6'
          }])
          .select('id')
          .single();

        if (!parentErr && newParent) {
          finalParentId = newParent.id;
        } else {
          finalParentId = null;
        }
      }
    }

    const payload = {
      user_id: userId,
      name: categoryData.name.trim(),
      type: targetType, // <--- Garantizamos que la subcategoría se guarde con su tipo real
      parent_id: finalParentId,
      icon: categoryData.icon || 'folder-outline',
      color: categoryData.color || '#3b82f6',
      is_default: false
    };

    const { data: inserted, error } = await supabase
      .from('categories')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return { data: inserted, error: null };
  } catch (err) {
    console.error('Error al crear categoría:', err.message);
    return { data: null, error: err.message };
  }
};

/**
 * Restaura los valores predeterminados borrando todo lo anterior del usuario.
 */
export const resetDefaultCategoriesService = async (userId) => {
  if (!userId) return [];
  try {
    await supabase.from('categories').delete().eq('user_id', userId);
    return await initializeDefaultCategories(userId);
  } catch (err) {
    console.error('Error al restaurar categorías:', err.message);
    return [];
  }
};
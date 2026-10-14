const FALLBACK_CATEGORIES = [
  { terms: ['supermercado', 'mercado', 'compra'], icon: 'cart-outline', color: '#f97316' },
  { terms: ['alimentación', 'alimentos', 'comida'], icon: 'restaurant-outline', color: '#f97316' },
  { terms: ['salario', 'sueldo', 'ingreso'], icon: 'cash-outline', color: '#22c55e' },
  { terms: ['transporte'], icon: 'car-outline', color: '#8b5cf6' },
  { terms: ['taxi'], icon: 'car-sport-outline', color: '#8b5cf6' },
  { terms: ['mascota'], icon: 'paw-outline', color: '#ec4899' },
  { terms: ['salud', 'médico', 'medico'], icon: 'heart-outline', color: '#ef4444' },
  { terms: ['casa', 'hogar', 'vivienda'], icon: 'home-outline', color: '#3b82f6' },
  { terms: ['entretenimiento'], icon: 'film-outline', color: '#eab308' },
  { terms: ['bienestar'], icon: 'leaf-outline', color: '#10b981' },
  { terms: ['deuda', 'préstamo', 'prestamo', 'fiado', 'borrowed', 'lent', 'financing'], icon: 'wallet-outline', color: '#3b82f6' },
  { terms: ['comisión', 'comision'], icon: 'cash-outline', color: '#fbbf24' },
];

export function getMovementCategoryPresentation(movement, categories = []) {
  const categoryName = String(movement?.category || '').trim();
  const normalizedName = categoryName.toLowerCase();
  const isIncome = ['ingresos', 'ingreso'].includes(String(movement?.type || '').toLowerCase())
    || Number(movement?.amount) > 0;
  const fallback = {
    icon: isIncome ? 'arrow-up-outline' : 'arrow-down-outline',
    color: isIncome ? '#a3e635' : '#f87171',
  };

  if (!normalizedName || normalizedName.includes('sin categoría') || normalizedName.includes('general')) {
    return fallback;
  }

  const matchingCategory = categories.find(category =>
    (movement?.category_id != null && String(category.id) === String(movement.category_id))
    || (category.name || '').trim().toLowerCase() === normalizedName
  );
  if (matchingCategory?.icon) {
    return {
      icon: matchingCategory.icon,
      color: matchingCategory.color || fallback.color,
    };
  }

  const matchingFallback = FALLBACK_CATEGORIES.find(({ terms }) =>
    terms.some(term => normalizedName.includes(term))
  );
  return matchingFallback
    ? { icon: matchingFallback.icon, color: matchingFallback.color }
    : fallback;
}

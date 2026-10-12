// ==========================================
// SERVICIO DE GAMIFICACIÓN Y XP DE kronos
// ==========================================

export const XP_CONFIG = {
  MOVEMENT: 15,       // Puntos por registrar un movimiento (ingreso o egreso)
  ACCOUNT: 30,        // Puntos por crear una nueva cuenta financiera
  TRANSFER: 20,       // Puntos por transferencias entre cuentas
  SPECIAL_BONUS: 45   // Bonus base por misiones especiales
};

// Catálogo ampliado de misiones especiales y comunes
export const MISSIONS_CONFIG = {
  // Lista de misiones especiales con límite de tiempo
  specialMissionsList: [
    {
      id: 'special_3_movements',
      title: 'Registra 3 movimientos en un solo día',
      rewardText: `¡Gana un bonus de +${XP_CONFIG.SPECIAL_BONUS} XP extra!`,
      badgeText: '+150% XP',
      timeLeft: 'Te quedan 3 días',
      rewardXP: XP_CONFIG.SPECIAL_BONUS
    },
    {
      id: 'special_new_account',
      title: 'Abre una cuenta en Divisas (USD/EUR)',
      rewardText: '¡Gana +60 XP por diversificar tus fondos!',
      badgeText: 'Divisas',
      timeLeft: 'Te quedan 5 días',
      rewardXP: 60
    },
    {
      id: 'special_first_transfer',
      title: 'Realiza tu primera transferencia entre cuentas',
      rewardText: '¡Gana +40 XP organizando tu dinero!',
      badgeText: 'Organización',
      timeLeft: 'Te quedan 2 días',
      rewardXP: 40
    }
  ],

  // Catálogo ampliado de misiones normales para subir XP constantemente
  commonMissions: [
    {
      id: 'movement',
      title: 'Registrar un movimiento (Ingreso/Egreso)',
      desc: 'Aporta constancia a tu control financiero diario',
      xp: XP_CONFIG.MOVEMENT,
      icon: 'swap-horizontal'
    },
    {
      id: 'account',
      title: 'Crear una nueva cuenta financiera',
      desc: 'Mantén separadas tus divisas, efectivo y bancos',
      xp: XP_CONFIG.ACCOUNT,
      icon: 'card-outline'
    },
    {
      id: 'transfer',
      title: 'Registrar una transferencia interna',
      desc: 'Mueve fondos de una cuenta a otra de forma segura',
      xp: XP_CONFIG.TRANSFER,
      icon: 'repeat-outline'
    },
    {
      id: 'budget_review',
      title: 'Revisar tu perfil financiero',
      desc: 'Consulta tus estadísticas y categorías de gasto',
      xp: 10,
      icon: 'pie-chart-outline'
    },
    {
      id: 'savings_goal',
      title: 'Registrar un ingreso por ahorro',
      desc: 'Premia tu disciplina apartando dinero extra',
      xp: 25,
      icon: 'wallet-outline'
    }
  ]
};

// Mantenemos retrocompatibilidad por si alguna pantalla llama directamente a specialMission
export const getActiveSpecialMission = (index = 0) => {
  return MISSIONS_CONFIG.specialMissionsList[index] || MISSIONS_CONFIG.specialMissionsList[0];
};

// Tabla explícita de umbrales de XP acumulada por nivel
const LEVELS_TABLE = [
  { level: 1, minXP: 0, maxXP: 150 },    // Nivel 1: de 0 a 150 XP
  { level: 2, minXP: 150, maxXP: 300 },  // Nivel 2: de 150 a 300 XP
  { level: 3, minXP: 300, maxXP: 450 },  // Nivel 3: de 300 a 450 XP
  { level: 4, minXP: 450, maxXP: 650 },  // Nivel 4: de 450 a 650 XP
  { level: 5, minXP: 650, maxXP: 900 },  // Nivel 5: de 650 a 900 XP
];

// Función para calcular el nivel actual y el progreso basado en la tabla explícita
export const calculateUserLevel = (totalXP) => {
  let currentTier = LEVELS_TABLE[LEVELS_TABLE.length - 1]; // Por defecto el último si lo supera
  
  for (let i = 0; i < LEVELS_TABLE.length; i++) {
    if (totalXP >= LEVELS_TABLE[i].minXP && totalXP < LEVELS_TABLE[i].maxXP) {
      currentTier = LEVELS_TABLE[i];
      break;
    }
  }

  const currentLevel = currentTier.level;
  const levelSpan = currentTier.maxXP - currentTier.minXP; 
  const xpInCurrentLevel = totalXP - currentTier.minXP;    
  const xpNeededForNextLevel = currentTier.maxXP - totalXP; 
  const xpPercentage = Math.min(Math.max((xpInCurrentLevel / levelSpan) * 100, 0), 100);

  return {
    currentLevel,
    xpInCurrentLevel,
    xpPercentage,
    xpNeededForNextLevel,
    maxXPPerLevel: levelSpan
  };
};
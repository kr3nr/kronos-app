import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const deliveredReminderKeys = new Set();

/**
 * Dispara una notificación local no invasiva adaptada para móviles y web.
 * @param {string} title - Título corto de la alerta
 * @param {string} body - Mensaje descriptivo
 * @param {object} data - Datos adicionales opcionales para navegación o referencia
 */
export async function sendLocalNotification(title, body, data = {}) {
  try {
    // Si estamos en la Web, las notificaciones nativas de Expo no aplican directamente
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body });
            }
          });
        }
      }
      return;
    }

    // Comportamiento normal para iOS y Android
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error al enviar la notificación local:', error);
  }
}

/**
 * Revisa y lanza alertas por pagos recurrentes próximos a vencer (ej: en los próximos 2 días).
 */
export function checkRecurringPaymentsAlerts(transactions = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  transactions.forEach(item => {
    if (item.due_date && item.status === 'pending' && item.type === 'pay') {
      const dueDate = new Date(item.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Si vence en 2 días o vence hoy
      if (diffDays === 2 || diffDays === 1) {
        const reminderKey = `${item.id || item.description || item.contact_name}:${item.due_date}`;
        if (deliveredReminderKeys.has(reminderKey)) return;
        deliveredReminderKeys.add(reminderKey);
        sendLocalNotification(
          '⏰ Pago Próximo a Vencer',
          `El pago de "${item.contact_name || item.description || 'Gasto'}" vence en ${diffDays === 1 ? '1 día' : `${diffDays} días`}.`
        );
      } else if (diffDays === 0) {
        const reminderKey = `${item.id || item.description || item.contact_name}:${item.due_date}`;
        if (deliveredReminderKeys.has(reminderKey)) return;
        deliveredReminderKeys.add(reminderKey);
        sendLocalNotification(
          '⚠️ Pago Vence Hoy',
          `Recuerda registrar el pago de "${item.contact_name || item.description || 'Gasto'}".`
        );
      }
    }
  });
}

/**
 * Alerta sobre el estado de metas de ahorro (ej: cuando se alcanza o está cerca del 100%).
 */
export function checkGoalsAlerts(goals = []) {
  goals.forEach(goal => {
    if (goal.target > 0 && goal.current >= goal.target) {
      // Podríamos validar para no repetir constantemente, pero enviamos la alerta de logro
      sendLocalNotification(
        '🎯 ¡Meta Alcanzada!',
        `¡Felicidades! Has completado el 100% de tu meta "${goal.name}".`
      );
    }
  });
}

/**
 * Alerta preventiva cuando los gastos de una categoría o general superan un límite o umbral.
 */
export function checkBudgetExceededAlerts(totalSpent, budgetLimit) {
  if (budgetLimit > 0 && totalSpent > budgetLimit) {
    sendLocalNotification(
      '🚨 Presupuesto Superado',
      `Has gastado ${totalSpent.toFixed(2)}, superando tu límite establecido de ${budgetLimit.toFixed(2)}.`
    );
  }
}
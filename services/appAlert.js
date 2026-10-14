const listeners = new Set();
const queue = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeToAppAlerts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getCurrentAppAlert = () => queue[0] || null;

export const dismissAppAlert = () => {
  if (queue.length === 0) return;
  queue.shift();
  notifyListeners();
};

export const Alert = {
  alert(title, message, buttons = [], options = {}) {
    queue.push({
      id: `${Date.now()}-${Math.random()}`,
      title: title || '',
      message: message || '',
      buttons: buttons.length > 0 ? buttons : [{ text: 'Entendido' }],
      cancelable: options.cancelable !== false,
    });
    notifyListeners();
  },
};

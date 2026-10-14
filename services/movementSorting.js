function getMovementMonth(movement) {
  return Number(movement.monthIndex ?? movement.month_index ?? 0);
}

function getMovementDay(movement) {
  return Number(movement.day ?? 0);
}

function getTimeInSeconds(movement) {
  const value = String(movement.time || '');
  const match = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);

  if (!match) {
    const timestamp = Date.parse(movement.created_at || '');
    if (Number.isNaN(timestamp)) return -1;
    const date = new Date(timestamp);
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  const meridiem = match[4]?.toUpperCase();

  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (meridiem === 'PM' && hours !== 12) hours += 12;

  return hours * 3600 + minutes * 60 + seconds;
}

export function sortMovementsByDateTime(movements) {
  return [...movements].sort((a, b) => {
    const monthDifference = getMovementMonth(b) - getMovementMonth(a);
    if (monthDifference !== 0) return monthDifference;

    const dayDifference = getMovementDay(b) - getMovementDay(a);
    if (dayDifference !== 0) return dayDifference;

    const timeDifference = getTimeInSeconds(b) - getTimeInSeconds(a);
    if (timeDifference !== 0) return timeDifference;

    return String(b.created_at || b.id || '').localeCompare(String(a.created_at || a.id || ''));
  });
}

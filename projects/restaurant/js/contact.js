/* ==========================================================================
   Maison Ambre — contact page: highlights today's opening hours and
   shows a live open / closed status.
   ========================================================================== */

/* Opening periods per weekday (0 = Sunday), expressed in minutes since midnight */
const openingPeriodsByWeekday = {
  0: [[12 * 60, 14 * 60 + 30]],
  1: [],
  2: [[12 * 60, 14 * 60], [19 * 60, 22 * 60 + 30]],
  3: [[12 * 60, 14 * 60], [19 * 60, 22 * 60 + 30]],
  4: [[12 * 60, 14 * 60], [19 * 60, 22 * 60 + 30]],
  5: [[12 * 60, 14 * 60], [19 * 60, 23 * 60]],
  6: [[12 * 60, 14 * 60], [19 * 60, 23 * 60]],
};

const frenchWeekdayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const openStatusElement = document.querySelector('[data-open-status]');

/* Formats minutes since midnight as « 19h » or « 22h30 » */
function formatMinutesAsFrenchTime(totalMinutes) {
  const hourPart = Math.floor(totalMinutes / 60);
  const minutePart = totalMinutes % 60;
  return minutePart ? `${hourPart}h${String(minutePart).padStart(2, '0')}` : `${hourPart}h`;
}

/* Finds the next opening moment after the current time, scanning up to a week ahead */
function findNextOpening(currentWeekday, currentMinutes) {
  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const candidateWeekday = (currentWeekday + dayOffset) % 7;
    const upcomingPeriod = openingPeriodsByWeekday[candidateWeekday].find(([periodStart]) => dayOffset > 0 || periodStart > currentMinutes);
    if (upcomingPeriod) return { dayOffset, weekday: candidateWeekday, startMinutes: upcomingPeriod[0] };
  }
  return null;
}

/* Highlights today's row and writes the open / closed status */
function renderOpeningStatus() {
  const currentDate = new Date();
  const currentWeekday = currentDate.getDay();
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  document.querySelectorAll('.hours-table tr[data-weekday]').forEach((hoursRowElement) => {
    const isToday = Number(hoursRowElement.dataset.weekday) === currentWeekday;
    hoursRowElement.classList.toggle('is-today', isToday);
    if (isToday) hoursRowElement.setAttribute('aria-current', 'date');
    else hoursRowElement.removeAttribute('aria-current');
  });
  const currentPeriod = openingPeriodsByWeekday[currentWeekday].find(([periodStart, periodEnd]) => currentMinutes >= periodStart && currentMinutes < periodEnd);
  openStatusElement.classList.toggle('is-open', Boolean(currentPeriod));
  if (currentPeriod) {
    openStatusElement.textContent = `Ouvert en ce moment · jusqu’à ${formatMinutesAsFrenchTime(currentPeriod[1])}`;
    return;
  }
  const nextOpening = findNextOpening(currentWeekday, currentMinutes);
  const nextDayLabel = nextOpening.dayOffset === 0 ? 'aujourd’hui' : nextOpening.dayOffset === 1 ? 'demain' : frenchWeekdayNames[nextOpening.weekday];
  openStatusElement.textContent = `Fermé · réouverture ${nextDayLabel} à ${formatMinutesAsFrenchTime(nextOpening.startMinutes)}`;
}

renderOpeningStatus();
setInterval(renderOpeningStatus, 60 * 1000);

document.addEventListener('DOMContentLoaded', () => {
 const back = document.querySelector('.portal-back');
 if (!back) return;
 back.addEventListener('click', (event) => {
  const dashboard = document.querySelector('#dashboard-panel, #journey-panel');
  const records = document.getElementById('secure-records');
  if (dashboard && !dashboard.hidden && records) {
   event.preventDefault();
   records.dispatchEvent(new Event('portal-back'));
   dashboard.scrollIntoView({block:'start'});
   return;
  }
  if (window.history.length > 1) {event.preventDefault();window.history.back();}
 });
});

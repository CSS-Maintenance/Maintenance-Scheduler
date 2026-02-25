const CACHE_NAME = 'maint-sched-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

let schedules = [];

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SYNC_SCHEDULES') {
    schedules = event.data.schedules || [];
    checkSchedules();
  }
});

function checkSchedules() {
  const now = new Date();
  
  schedules.forEach(task => {
    if (task.notified) return;
    
    const taskTime = new Date(task.date + 'T' + task.time);
    const diff = taskTime - now;
    
    // Notify if task is due within 5 minutes or past due
    if (diff <= 300000 && diff > -3600000) {
      self.registration.showNotification('🔧 Maintenance Due!', {
        body: `${task.computer} - ${task.type} at ${task.time}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        data: { taskId: task.id }
      });
      
      // Notify main thread
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'TASK_DUE',
            taskId: task.id
          });
        });
      });
    }
  });
}

// Check every minute
setInterval(checkSchedules, 60000);

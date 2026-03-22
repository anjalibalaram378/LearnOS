const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const toggleBtn = document.getElementById('toggleBtn');

chrome.storage.local.get(['gg_active', 'gg_log'], (data) => {
  const active = !!data.gg_active;
  const log = data.gg_log || [];

  // Status
  dot.className = 'dot ' + (active ? 'on' : 'off');
  statusText.textContent = active ? 'GoalGuard is blocking distractions' : 'GoalGuard is paused';
  toggleBtn.textContent = active ? 'Pause GoalGuard' : 'Activate GoalGuard';
  toggleBtn.className = 'toggle ' + (active ? 'on' : 'off');

  // Stats
  document.getElementById('blockCount').textContent = log.filter(e => e.blocked).length;
  document.getElementById('distractCount').textContent = log.filter(e => e.type === 'distraction').length;
});

toggleBtn.addEventListener('click', () => {
  chrome.storage.local.get(['gg_active'], (data) => {
    const newVal = !data.gg_active;
    chrome.storage.local.set({ gg_active: newVal }, () => {
      dot.className = 'dot ' + (newVal ? 'on' : 'off');
      statusText.textContent = newVal ? 'GoalGuard is blocking distractions' : 'GoalGuard is paused';
      toggleBtn.textContent = newVal ? 'Pause GoalGuard' : 'Activate GoalGuard';
      toggleBtn.className = 'toggle ' + (newVal ? 'on' : 'off');
    });
  });
});

document.getElementById('openApp').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://learn-os.vercel.app/goalguard' });
});

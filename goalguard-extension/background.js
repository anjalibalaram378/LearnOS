const DISTRACTION_DOMAINS = [
  'instagram.com',
  'facebook.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'netflix.com',
  'snapchat.com',
  'pinterest.com',
];

function isDomainBlocked(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return DISTRACTION_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading') return;
  const url = changeInfo.url || tab.url;
  if (!url) return;

  chrome.storage.local.get(['gg_active', 'gg_goals'], (data) => {
    if (!data.gg_active) return;
    if (!isDomainBlocked(url)) return;

    // Log distraction
    const entry = {
      type: 'distraction',
      site: new URL(url).hostname.replace('www.', ''),
      domain: new URL(url).hostname.replace('www.', ''),
      icon: '🚫',
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      duration: '—',
      blocked: true,
    };

    chrome.storage.local.get(['gg_log'], (d) => {
      const log = d.gg_log || [];
      log.unshift(entry);
      chrome.storage.local.set({ gg_log: log.slice(0, 50) });
    });

    // Send notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '🛡️ GoalGuard — Blocked!',
      message: `${entry.site} is a distraction. Stay focused on your goals!`,
      priority: 2,
    });

    // Redirect to GoalGuard page in the app
    const blocked = 'http://localhost:3000/goalguard?blocked=' + encodeURIComponent(entry.site);
    chrome.tabs.update(tabId, { url: blocked });
  });
});

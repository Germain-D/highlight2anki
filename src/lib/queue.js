// État local : file des notes non envoyées + compteur d'ajouts.
const KEYS = { queue: "queue", stats: "stats" };

async function readQueue() {
  const { queue } = await chrome.storage.local.get({ [KEYS.queue]: [] });
  return queue;
}

export async function enqueue(note) {
  const queue = await readQueue();
  queue.push({ ...note, queuedAt: Date.now() });
  await chrome.storage.local.set({ [KEYS.queue]: queue });
  return queue.length;
}

export async function queueCount() {
  return (await readQueue()).length;
}

// Rejoue la file avec `send` (typiquement anki.addNote). S'arrête au premier
// échec non-fatal pour ne pas marteler un Anki toujours fermé ; les doublons
// sont retirés puisque les rejouer ne servira jamais à rien.
export async function flush(send) {
  const queue = await readQueue();
  let sent = 0;
  let dropped = 0;
  let error = null;

  while (queue.length) {
    const note = queue[0];
    try {
      await send(note);
      queue.shift();
      sent++;
    } catch (err) {
      if (/duplicate/i.test(err?.message || "")) {
        queue.shift();
        dropped++;
        continue;
      }
      error = err;
      break;
    }
  }

  await chrome.storage.local.set({ [KEYS.queue]: queue });
  if (sent) await incrementAdded(sent);
  return { sent, dropped, remaining: queue.length, error };
}

export async function getStats() {
  const { stats } = await chrome.storage.local.get({ [KEYS.stats]: { added: 0 } });
  return stats;
}

export async function incrementAdded(by = 1) {
  const stats = await getStats();
  stats.added = (stats.added || 0) + by;
  await chrome.storage.local.set({ [KEYS.stats]: stats });
  return stats.added;
}

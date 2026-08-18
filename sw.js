const CACHE = "enlab-v25";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./guide.js",
  "./levels.js",
  "./extras.js",
  "./i18n.js",
  "./idb-backup.js",
  "./pack.js",
  "./pack-m.js",
  "./pack-n.js",
  "./pack-o.js",
  "./pack-q.js",
  "./pack-s.js",
  "./pack-u.js",
  "./pack-v.js",
  "./pack-bulk.js",
  "./pack-podcasts.js",
  "./features-nr.js",
  "./features-sv.js",
  "./loader.js",
  "./pron-audio.js",
  "./manifest.webmanifest",
  "./icon.svg",
];
const REMIND_URL = "./enlab-remind.json";
const TAB_ASSETS = {
  vocales: ["./pack-s.js", "./pack-n.js", "./pack-bulk.js"],
  hablar: ["./pack-o.js", "./pack-v.js", "./pack-u.js"],
  quiz: ["./pack.js", "./pack-m.js"],
  hoy: ["./pack-q.js", "./pack-bulk.js"],
};

function todayKeySW() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function saveRemind(payload) {
  const cache = await caches.open(CACHE);
  await cache.put(REMIND_URL, new Response(JSON.stringify(payload || {}), {
    headers: { "Content-Type": "application/json" },
  }));
}

async function loadRemind() {
  const cache = await caches.open(CACHE);
  const res = await cache.match(REMIND_URL);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}

async function maybeRemind() {
  const data = await loadRemind();
  if (!data || !data.on) return;
  const today = todayKeySW();
  if (data.complete === today) return;
  const due = typeof data.dueCount === "number" ? data.dueCount : 0;
  const body = due > 0
    ? `Tienes ${due} ítems de repaso pendientes. ¿15 minutos hoy?`
    : "¿Ya hiciste tus 15 minutos?";
  await self.registration.showNotification("English Lab", {
    body,
    icon: "./icon.svg",
    tag: "enlab-daily",
    data: { url: "./index.html#hoy" },
  });
}

async function precacheTabAssets(tab) {
  const files = TAB_ASSETS[tab] || [];
  if (!files.length) return;
  const cache = await caches.open(CACHE);
  await Promise.all(files.map((f) => cache.add(f).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.ok && new URL(event.request.url).origin === location.origin) {
            caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg && msg.type === "enlab-remind") {
    event.waitUntil(saveRemind(msg.payload));
  }
  if (msg && msg.type === "enlab-precache-tab") {
    event.waitUntil(precacheTabAssets(msg.tab));
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "enlab-remind") event.waitUntil(maybeRemind());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const hit = list.find((c) => c.url && "focus" in c);
      if (hit) return hit.focus();
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});

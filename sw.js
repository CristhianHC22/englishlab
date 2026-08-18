const CACHE = "enlab-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./guide.js",
  "./levels.js",
  "./extras.js",
  "./pack.js",
  "./manifest.webmanifest",
  "./icon.svg",
];
const REMIND_URL = "./enlab-remind.json";

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
  await self.registration.showNotification("English Lab", {
    body: "¿Ya hiciste tus 15 minutos?",
    icon: "./icon.svg",
    tag: "enlab-daily",
  });
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
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "enlab-remind") event.waitUntil(maybeRemind());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const hit = list.find((c) => c.url && "focus" in c);
      if (hit) return hit.focus();
      if (self.clients.openWindow) return self.clients.openWindow("./");
      return undefined;
    })
  );
});

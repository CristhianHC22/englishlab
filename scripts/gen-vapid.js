/* Generate VAPID keys. Public → vapid-public.js; private → vapid-private.json (gitignored). */
const webpush = require("web-push");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const keys = webpush.generateVAPIDKeys();
fs.writeFileSync(
  path.join(ROOT, "vapid-public.js"),
  `window.ENLAB_VAPID_PUBLIC = ${JSON.stringify(keys.publicKey)};\n`,
);
fs.writeFileSync(
  path.join(ROOT, "vapid-private.json"),
  JSON.stringify({ publicKey: keys.publicKey, privateKey: keys.privateKey, subject: "mailto:englishlab@localhost" }, null, 2),
);
console.log("Wrote vapid-public.js and vapid-private.json");
console.log("Public:", keys.publicKey);

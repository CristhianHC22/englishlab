/* Send a Web Push to a stored subscription.
   Usage:
     node scripts/push-remind.js
     node scripts/push-remind.js --sub path/to/sub.json --body "Hoy: 15 minutos"
   Needs vapid-private.json (from npm run vapid) or env VAPID_PUBLIC / VAPID_PRIVATE / VAPID_SUBJECT.
*/
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

async function main() {
  let webpush;
  try { webpush = require("web-push"); } catch {
    console.error("Install web-push: npm i -D web-push");
    process.exit(1);
  }
  let publicKey = process.env.VAPID_PUBLIC;
  let privateKey = process.env.VAPID_PRIVATE;
  let subject = process.env.VAPID_SUBJECT || "mailto:englishlab@localhost";
  const privPath = path.join(ROOT, "vapid-private.json");
  if ((!publicKey || !privateKey) && fs.existsSync(privPath)) {
    const j = JSON.parse(fs.readFileSync(privPath, "utf8"));
    publicKey = publicKey || j.publicKey;
    privateKey = privateKey || j.privateKey;
    subject = j.subject || subject;
  }
  if (!publicKey || !privateKey) {
    console.error("Missing VAPID keys. Run npm run vapid or set VAPID_PUBLIC / VAPID_PRIVATE.");
    process.exit(1);
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const subPath = arg("sub", path.join(ROOT, "push-sub.json"));
  if (!fs.existsSync(subPath)) {
    console.error(`No subscription at ${subPath}. Enable reminders in the app, then copy localStorage enlab-push-sub into push-sub.json`);
    process.exit(1);
  }
  const subscription = JSON.parse(fs.readFileSync(subPath, "utf8"));
  const payload = JSON.stringify({
    title: arg("title", "English Lab"),
    body: arg("body", "¿Ya hiciste tus 15 minutos?"),
    url: arg("url", "./index.html#hoy"),
    tag: "enlab-push",
  });
  await webpush.sendNotification(subscription, payload);
  console.log("Push sent.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

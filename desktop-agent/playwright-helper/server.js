/**
 * Local Playwright helper. The Java agent is the controller.
 * Binds to 127.0.0.1 only. Persistent profile cookies stay on this PC.
 */
const http = require("http");
const fs = require("fs");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (error) {
  console.error("DEPENDENCY_MISSING playwright");
  process.exit(2);
}

let browser;
let context;
let page;
let control = "AGENT";
let persistent = false;

function profileAllowed(dir) {
  if (!dir) {
    return false;
  }
  const normalized = dir.replace(/\\/g, "/").toLowerCase();
  return normalized.includes("/tron/browser-profile/") || normalized.includes("/tron/browser-profile");
}

async function ensurePage(options) {
  const headed = !!(options && options.headed);
  const wantPersistent = !!(options && (options.persistent || options.headed));
  if (!context) {
    if (wantPersistent) {
      const dir = (options && options.profileDir) || process.env.TRON_BROWSER_PROFILE;
      if (!profileAllowed(dir)) {
        throw new Error("Browser profile directory is not in the TRON browser profile folder");
      }
      fs.mkdirSync(dir, { recursive: true });
      context = await chromium.launchPersistentContext(dir, {
        headless: !headed,
        viewport: { width: 1100, height: 800 }
      });
      persistent = true;
      page = context.pages()[0] || await context.newPage();
    } else {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      page = await context.newPage();
    }
  }
  return page;
}

function agentMayMutate() {
  return control === "AGENT" || control === "AGENT_CONTROLLED";
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(json);
}

function loginRequired(text) {
  const value = String(text || "").toLowerCase();
  if (value.includes("tron logged in")) {
    return false;
  }
  return value.includes("tron login") || value.includes("password") || value.includes("sign in") || value.includes("log in");
}

const server = http.createServer(async (req, res) => {
  if (req.socket.remoteAddress !== "127.0.0.1" && req.socket.remoteAddress !== "::1" && req.socket.remoteAddress !== "::ffff:127.0.0.1") {
    send(res, 403, { ok: false, error: "local only" });
    return;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  let msg = {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw) {
    try {
      msg = JSON.parse(raw);
    } catch (error) {
      send(res, 400, { ok: false, error: "invalid json" });
      return;
    }
  }
  try {
    const human = req.url === "/human/type" || req.url === "/human/click";
    if ((req.url === "/open" || req.url === "/click" || req.url === "/type") && !agentMayMutate()) {
      send(res, 409, { ok: false, error: "Browser is under user control" });
      return;
    }
    if (human && control !== "USER" && control !== "USER_CONTROLLED" && control !== "WAITING_USER") {
      send(res, 409, { ok: false, error: "Browser is not waiting for the user" });
      return;
    }
    if (req.url === "/open") {
      const url = String(msg.url || "");
      if (!/^https?:\/\//i.test(url)) {
        send(res, 400, { ok: false, error: "Only http and https URLs are allowed" });
        return;
      }
      const current = await ensurePage(msg);
      await current.goto(url, { waitUntil: "domcontentloaded", timeout: msg.timeoutMs || 30000 });
      send(res, 200, { ok: true, title: await current.title(), url: current.url() });
      return;
    }
    if (req.url === "/click" || req.url === "/human/click") {
      const current = await ensurePage(msg);
      await current.click(String(msg.selector), { timeout: msg.timeoutMs || 10000 });
      await current.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
      send(res, 200, { ok: true, title: await current.title(), url: current.url() });
      return;
    }
    if (req.url === "/type" || req.url === "/human/type") {
      const current = await ensurePage(msg);
      const selector = String(msg.selector || "");
      await current.fill(selector, String(msg.text || ""));
      send(res, 200, { ok: true, title: await current.title(), url: current.url() });
      return;
    }
    if (req.url === "/text" || req.url === "/inspect") {
      const current = await ensurePage(msg);
      const text = await current.locator(String(msg.selector || "body")).innerText({ timeout: msg.timeoutMs || 10000 });
      const title = await current.title();
      const url = current.url();
      send(res, 200, {
        ok: true,
        text: String(text).slice(0, 2000),
        title,
        url,
        loginRequired: loginRequired(text)
      });
      return;
    }
    if (req.url === "/wait") {
      const current = await ensurePage(msg);
      await current.locator(String(msg.selector)).waitFor({ timeout: msg.timeoutMs || 10000 });
      send(res, 200, { ok: true, title: await current.title(), url: current.url() });
      return;
    }
    if (req.url === "/visible") {
      const current = await ensurePage(msg);
      const visible = await current.locator(String(msg.selector)).isVisible();
      send(res, 200, { ok: true, visible, title: await current.title(), url: current.url() });
      return;
    }
    if (req.url === "/screenshot") {
      const current = await ensurePage(msg);
      const buffer = await current.screenshot({ type: "png" });
      if (!buffer || buffer.length < 8) {
        send(res, 500, { ok: false, error: "Screenshot failed" });
        return;
      }
      send(res, 200, {
        ok: true,
        screenshotBase64: buffer.toString("base64"),
        mimeType: "image/png",
        title: await current.title(),
        url: current.url()
      });
      return;
    }
    if (req.url === "/control") {
      const mode = String(msg.mode || msg.browserControl || "AGENT").toUpperCase();
      if (mode === "USER" || mode === "USER_CONTROLLED" || mode === "WAITING_USER") {
        control = "USER";
      } else if (mode === "CLOSED") {
        control = "AGENT";
      } else if (mode === "AGENT" || mode === "AGENT_CONTROLLED") {
        control = "AGENT";
      } else {
        send(res, 400, { ok: false, error: "Unknown browser control" });
        return;
      }
      send(res, 200, { ok: true, control, title: page ? await page.title() : "", url: page ? page.url() : "" });
      return;
    }
    if (req.url === "/focus" || req.url === "/bring-to-front") {
      if (page) {
        await page.bringToFront().catch(() => {});
        send(res, 200, { ok: true, title: await page.title().catch(() => ""), url: page.url() });
      } else {
        send(res, 200, { ok: true, message: "No active browser page" });
      }
      return;
    }
    if (req.url === "/close") {
      if (context) {
        await context.close();
      }
      context = null;
      page = null;
      if (browser) {
        await browser.close();
        browser = null;
      }
      persistent = false;
      control = "AGENT";
      send(res, 200, { ok: true });
      return;
    }
    send(res, 404, { ok: false, error: "unknown route" });
  } catch (error) {
    send(res, 500, { ok: false, error: String(error && error.message ? error.message : error) });
  }
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  console.log("LISTENING " + address.port);
});

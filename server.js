// server.js — Halo CSR Wrapper (Railway)
// Forwards /csr -> Grunt with shared-secret, returns { csr, tier }

import express from "express";
import fetch from "node-fetch";

const app = express();

const PORT = process.env.PORT || 3000;
const GRUNT_URL = process.env.GRUNT_URL;                 // e.g. https://nodejs-hxhj-production.up.railway.app
const GRUNT_SHARED_SECRET = process.env.GRUNT_SHARED_SECRET; // same value you set on Grunt

// Basic health probe (optional)
app.get("/health", (_req, res) => res.json({ ok: true }));

// Main CSR endpoint (Cloudflare Worker calls this)
app.get("/csr", async (req, res) => {
  try {
    // Validate inputs
    const gt = req.query.gt;
    const playlist = req.query.playlist;
    if (!gt || !playlist) {
      return res.status(400).json({ error: "Missing gt or playlist" });
    }

    if (!GRUNT_URL || !GRUNT_SHARED_SECRET) {
      return res.status(500).json({ error: "Wrapper not configured (GRUNT_URL/GRUNT_SHARED_SECRET)" });
    }

    // Build Grunt upstream URL
    const upstream = `${GRUNT_URL.replace(/\/+$/, "")}/spartan?gt=${encodeURIComponent(gt)}&playlist=${encodeURIComponent(playlist)}`;

    // Forward request to Grunt with shared secret
    const r = await fetch(upstream, {
      headers: { "x-grunt-auth": GRUNT_SHARED_SECRET }
    });

    // Bubble up Grunt error details if any
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return res.status(502).json({
        error: "Grunt upstream error",
        status: r.status,
        body
      });
    }

    // Expect Grunt to return { csr, tier }
    const data = await r.json().catch(() => null);
    if (!data || (typeof data !== "object")) {
      return res.status(502).json({ error: "Invalid JSON from Grunt" });
    }

    return res.json({
      csr: data.csr ?? null,
      tier: data.tier ?? null
    });
  } catch (err) {
    console.error("Wrapper exception:", err);
    return res.status(500).json({ error: "Wrapper exception" });
  }
});

// Fallback 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Wrapper running on port ${PORT}`);
  console.log(`Using GRUNT_URL=${GRUNT_URL}`);
});

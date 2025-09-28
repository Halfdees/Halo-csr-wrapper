import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Secrets
const HALO_SHARED_SECRET = process.env.HALO_SHARED_SECRET;    // from Worker
const GRUNT_URL = process.env.GRUNT_URL;                      // e.g. https://halo-grunt-service-production.up.railway.app
const GRUNT_SHARED_SECRET = process.env.GRUNT_SHARED_SECRET;  // wrapper->grunt secret

function mapCsrToTier(csr) {
  if (csr >= 1800) return "Onyx";
  if (csr >= 1500) return "Diamond";
  if (csr >= 1300) return "Platinum";
  if (csr >= 1100) return "Gold";
  if (csr >= 900)  return "Silver";
  return "Bronze";
}

app.get("/", (_req, res) => res.send("wrapper ok"));

// Main contract for your Worker/Bot
app.get("/csr", async (req, res) => {
  // verify Worker->Wrapper secret
  const haloAuth = req.get("x-halo-auth");
  if (!haloAuth || haloAuth !== HALO_SHARED_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const gt = (req.query.gt || "").trim();
  const playlist = (req.query.playlist || "").trim();
  if (!gt || !playlist) return res.status(400).send("Missing gt or playlist");
  if (!GRUNT_URL) return res.status(503).send("GRUNT_URL not configured");

  try {
    // 1) gamertag -> xuid via Grunt
    const xuidResp = await fetch(
      `${GRUNT_URL}/xuid?gt=${encodeURIComponent(gt)}`,
      { headers: { "x-grunt-auth": GRUNT_SHARED_SECRET } }
    );
    if (!xuidResp.ok) {
      const body = await xuidResp.text().catch(()=> "");
      console.error("Grunt /xuid error", xuidResp.status, body);
      return res.status(502).send("Upstream error");
    }
    const { xuid } = await xuidResp.json();
    if (!xuid) return res.status(404).send("XUID not found");

    // 2) csr via Grunt
    const csrResp = await fetch(
      `${GRUNT_URL}/csr?xuid=${encodeURIComponent(xuid)}&playlist=${encodeURIComponent(playlist)}`,
      { headers: { "x-grunt-auth": GRUNT_SHARED_SECRET } }
    );
    if (!csrResp.ok) {
      const body = await csrResp.text().catch(()=> "");
      console.error("Grunt /csr error", csrResp.status, body);
      return res.status(502).send("Upstream error");
    }
    const csrJson = await csrResp.json(); // expect { csr, tier? }

    const csr = Number.isFinite(csrJson?.csr) ? csrJson.csr : null;
    const tier = csrJson?.tier || (csr != null ? mapCsrToTier(csr) : "Unknown");

    return res.json({ csr, tier });
  } catch (e) {
    console.error("Wrapper→Grunt failed:", e);
    return res.status(502).send("Upstream error");
  }
});

app.listen(PORT, () => {
  console.log(`Wrapper listening on :${PORT}`);
});

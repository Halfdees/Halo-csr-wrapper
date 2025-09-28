// wrapper.js — Railway service: CSR data provider

import express from "express";
const app = express();

const PORT = process.env.PORT || 3000;
const SHARED_SECRET = process.env.HALO_SHARED_SECRET;

app.get("/csr", (req, res) => {
  // Verify secret
  const auth = req.headers["x-halo-auth"];
  if (!auth || auth !== SHARED_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const gt = req.query.gt;
  const playlist = req.query.playlist;

  if (!gt || !playlist) {
    return res.status(400).send("Missing gt or playlist");
  }

  // --- Stubbed response (replace with real CSR lookup later) ---
  return res.json({
    csr: `CSR for ${gt} in playlist ${playlist}`,
    tier: "Onyx" // Example role tier
  });
});

app.listen(PORT, () => {
  console.log(`Wrapper running on port ${PORT}`);
});

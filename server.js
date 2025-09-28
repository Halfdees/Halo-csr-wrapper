import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

// Simple health check
app.get("/", (_, res) => res.send("wrapper ok"));

// The endpoint your Worker will call
app.get("/csr", (req, res) => {
  const { gt, playlist } = req.query;
  if (!gt || !playlist) {
    return res.status(400).json({ error: "missing gt/playlist" });
  }

  // ⛳️ STUB: return fake data so you can test end-to-end.
  // Later you’ll replace this with the Grunt-backed code.
  return res.json({
    csr: 1450,
    tier: "Diamond 2"
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Wrapper stub listening on ${PORT}`);
});

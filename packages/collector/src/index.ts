import express from "express";

const app = express();
const PORT = 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Collector listening on port ${PORT}`);
});

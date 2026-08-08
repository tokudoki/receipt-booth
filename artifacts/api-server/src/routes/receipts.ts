import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();

interface StoredReceipt {
  data: Buffer;
  expiresAt: number;
}

const store = new Map<string, StoredReceipt>();

const TTL_MS = 30 * 60 * 1000; // 30 minutes

// POST /receipts — accept a base64 PNG data URL and store it temporarily
router.post("/receipts", (req, res) => {
  const { image } = req.body as { image?: string };

  if (!image || typeof image !== "string") {
    res.status(400).json({ error: "Missing image field" });
    return;
  }

  // Strip the data URL prefix if present
  const base64 = image.startsWith("data:")
    ? image.split(",")[1]
    : image;

  if (!base64) {
    res.status(400).json({ error: "Invalid image data" });
    return;
  }

  let data: Buffer;
  try {
    data = Buffer.from(base64, "base64");
  } catch {
    res.status(400).json({ error: "Failed to decode image" });
    return;
  }

  const id = randomUUID();
  const expiresAt = Date.now() + TTL_MS;
  store.set(id, { data, expiresAt });

  // Auto-delete after TTL
  setTimeout(() => {
    store.delete(id);
  }, TTL_MS);

  res.json({ id });
});

// GET /receipts/:id — serve the stored image
router.get("/receipts/:id", (req, res) => {
  const { id } = req.params;
  const entry = store.get(id);

  if (!entry) {
    res.status(404).json({ error: "Receipt not found or expired" });
    return;
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(id);
    res.status(404).json({ error: "Receipt expired" });
    return;
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", "inline; filename=\"receipt.png\"");
  res.setHeader("Cache-Control", "public, max-age=1800");
  res.end(entry.data);
});

export default router;

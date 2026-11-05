const express = require("express");
const os = require("os");
const { createClient } = require("redis");

const PORT = Number(process.env.PORT || 3000);
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const APP_VERSION = process.env.APP_VERSION || "v1";
const MESSAGE = "Namaste from hello-app!";

const redis = createClient({ url: REDIS_URL, password: process.env.REDIS_PASSWORD || undefined });
redis.on("error", (err) => console.error("redis error:", err.message));

const app = express();

// main page: har request pe visit count +1, aur batata hai kis container/pod ne jawab diya
app.get("/", async (req, res) => {
  if (!redis.isReady) return res.status(503).json({ error: "redis not ready" });
  const visits = await redis.incr("visits");
  res.json({ message: MESSAGE, version: APP_VERSION, servedBy: os.hostname(), visits });
});

// liveness: process zinda hai?
app.get("/healthz", (req, res) => res.send("ok"));

// readiness: traffic lene ko ready hai? (redis connect hua ya nahi)
app.get("/readyz", (req, res) => {
  if (redis.isReady) return res.send("ready");
  res.status(503).send("redis not ready");
});

// autoscaling demo: 200ms tak CPU jalata hai
app.get("/work", (req, res) => {
  const end = Date.now() + 200;
  let x = 0;
  while (Date.now() < end) x += Math.sqrt(Math.random());
  res.json({ servedBy: os.hostname(), done: true });
});

const server = app.listen(PORT, () => console.log(`hello-app ${APP_VERSION} listening on ${PORT}`));

// redis baad mein aaye to bhi app start ho jaaye; client khud retry karta hai
redis.connect().catch((err) => console.error("redis connect failed:", err.message));

// docker stop / kubernetes rolling update SIGTERM bhejta hai: chalti requests poori karke band ho
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    await redis.quit().catch(() => {});
    process.exit(0);
  });
});

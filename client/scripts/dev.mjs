import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outdir = path.join(projectRoot, "dist");

const contentType = (filePath) => {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".map")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
};

const indexHtml = fs.readFileSync(path.join(outdir, "index.html"), "utf8");

const server = createServer((req, res) => {
  if (req.url === "/favicon.ico") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const pathname = req.url.split("?")[0];
  const urlPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(outdir, decodeURIComponent(urlPath || "/"));

  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      res.setHeader("Content-Type", contentType(filePath));
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  } catch {
    if (urlPath === "/index.html" || !path.extname(urlPath)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(indexHtml);
      return;
    }
    res.statusCode = 404;
    res.end("Not found");
    return;
  }
});

server.listen(5173, "127.0.0.1", () => {
  console.log("Client dev server running on http://127.0.0.1:5173");
});

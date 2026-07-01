import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outdir = path.join(projectRoot, "dist");

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
      if (filePath.endsWith(".html")) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
      } else if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      } else if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css; charset=utf-8");
      }
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  } catch {
    if (urlPath === "/index.html" || !path.extname(urlPath)) {
      res.setHeader("Content-Type", "text/html");
      res.end(fs.readFileSync(path.join(outdir, "index.html"), "utf8"));
      return;
    }
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.listen(4173, () => {
  console.log("Preview server running on http://localhost:4173");
});

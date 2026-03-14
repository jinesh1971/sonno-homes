import { describe, it, expect } from "vitest";
import app from "../index.js";
import http from "http";

function request(app: any, method: string, path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address() as { port: number };
      const req = http.request(
        { hostname: "localhost", port: addr.port, path, method },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            server.close();
            resolve({ status: res.statusCode!, body: JSON.parse(data) });
          });
        }
      );
      req.on("error", (err) => { server.close(); reject(err); });
      req.end();
    });
  });
}

describe("Health endpoint", () => {
  it("GET /api/health returns 200 with status ok", async () => {
    const res = await request(app, "GET", "/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.timestamp).toBeDefined();
  });
});

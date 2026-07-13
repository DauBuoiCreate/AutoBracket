import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { connect, type AddressInfo } from "node:net";
import { describe, expect, it, vi } from "vitest";

import { observeNodeRequest, sendNodeJsonResponse } from "./node-http.js";
import { createStructuredLogger } from "./observability.js";

describe("Node HTTP observability", () => {
  it("propagates correlation ID, strips query data from logs and writes JSON safely", () => {
    const request = {
      headers: { "x-correlation-id": "node-health-20260713" },
      method: "GET",
      url: "/health?token=must-not-be-logged",
    } as unknown as IncomingMessage;
    const writeHead = vi.fn();
    const end = vi.fn();
    const response = { end, writeHead } as unknown as ServerResponse;
    const lines: string[] = [];
    const logger = createStructuredLogger({
      clock: () => new Date("2026-07-13T06:00:00.000Z"),
      minimumLevel: "debug",
      release: "p0-test",
      service: "realtime",
      sink: (line) => lines.push(line),
    });

    const observed = observeNodeRequest(request);
    sendNodeJsonResponse(response, observed, 200, { status: "ok" }, logger);

    expect(observed).toMatchObject({
      correlationId: "node-health-20260713",
      method: "GET",
      path: "/health",
      requestTargetValid: true,
    });
    expect(writeHead).toHaveBeenCalledWith(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "x-correlation-id": "node-health-20260713",
    });
    expect(end).toHaveBeenCalledWith('{"status":"ok"}');
    expect(lines.join("\n")).not.toContain("must-not-be-logged");
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      correlationId: "node-health-20260713",
      event: "http.request",
      path: "/health",
      statusCode: 200,
    });
  });

  it("marks malformed request targets without throwing or logging their contents", () => {
    const request = {
      headers: {},
      method: "GET",
      url: "http://[?token=must-not-be-logged",
    } as unknown as IncomingMessage;

    expect(observeNodeRequest(request)).toMatchObject({
      method: "GET",
      path: "[INVALID_REQUEST_TARGET]",
      requestTargetValid: false,
    });
  });

  it("survives a malformed raw request and continues serving later requests", async () => {
    const logger = createStructuredLogger({
      minimumLevel: "debug",
      service: "realtime",
      sink: () => undefined,
    });
    const server = createServer((request, response) => {
      const observed = observeNodeRequest(request);
      sendNodeJsonResponse(
        response,
        observed,
        observed.requestTargetValid ? 200 : 400,
        observed.requestTargetValid
          ? { status: "ok" }
          : { error: { code: "INVALID_REQUEST_TARGET" } },
        logger,
      );
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const address = server.address() as AddressInfo;
      const rawResponse = await new Promise<string>((resolve, reject) => {
        const socket = connect(address.port, "127.0.0.1", () => {
          socket.write("GET http://[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n");
        });
        let output = "";
        socket.setEncoding("utf8");
        socket.on("data", (chunk) => {
          output += chunk;
        });
        socket.once("end", () => resolve(output));
        socket.once("error", reject);
      });

      expect(rawResponse).toContain("400 Bad Request");
      expect(rawResponse).toContain("INVALID_REQUEST_TARGET");

      const laterResponse = await fetch(`http://127.0.0.1:${address.port}/health`);
      expect(laterResponse.status).toBe(200);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});

import type { HealthPayload } from "@autobracket/contracts";

import { readWebEnvironment } from "../../../config/env";
import { observedJsonResponse, observeRequest } from "../../../lib/request-observability";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const observedRequest = observeRequest(request);
  readWebEnvironment();

  const payload: HealthPayload = {
    service: "web",
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  return observedJsonResponse(observedRequest, payload, 200);
}

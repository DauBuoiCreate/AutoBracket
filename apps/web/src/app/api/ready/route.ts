import { createReadinessPayload, type ReadinessPayload } from "@autobracket/contracts";
import { checkDatabaseReadiness } from "@autobracket/db";

import { readWebEnvironment } from "../../../config/env";
import { checkRedisReadiness } from "../../../lib/redis-readiness";
import { observedJsonResponse, observeRequest } from "../../../lib/request-observability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const observedRequest = observeRequest(request);
  const environment = readWebEnvironment();
  const dependencies = await Promise.all([
    checkDatabaseReadiness(environment.DATABASE_URL),
    checkRedisReadiness(environment.REDIS_URL),
  ]);
  const payload: ReadinessPayload = createReadinessPayload("web", dependencies);

  return observedJsonResponse(observedRequest, payload, payload.status === "ready" ? 200 : 503);
}

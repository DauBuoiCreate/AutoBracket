import { loadRootEnvironmentFile } from "../../../scripts/load-root-env.mjs";

import { readWebEnvironment } from "../src/config/env.js";

loadRootEnvironmentFile();
readWebEnvironment();

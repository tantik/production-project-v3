import { getEnvSummary } from "../services/env.js";

const summary = getEnvSummary();
console.log(JSON.stringify(summary, null, 2));

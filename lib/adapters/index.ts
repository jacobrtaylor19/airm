/**
 * Adapter Registry
 *
 * Returns the appropriate TargetSystemAdapter instance based on the
 * configured adapter type. For now only the mock adapter is available.
 */

import type { TargetSystemAdapter } from "./target-system-adapter";
import { MockSapAdapter } from "./mock-sap-adapter";

const ADAPTER_TYPES: Record<string, () => TargetSystemAdapter> = {
  mock: () => new MockSapAdapter(),
  // Future adapters:
  // sap_s4hana: (config) => new SapS4HanaAdapter(config),
  // workday: (config) => new WorkdayAdapter(config),
  // servicenow: (config) => new ServiceNowAdapter(config),
  // oracle_fusion: (config) => new OracleFusionAdapter(config),
};

/**
 * Get a target system adapter by type.
 *
 * @param type - Adapter type key (e.g., "mock", "sap_s4hana")
 * @param _config - Connection configuration (host, credentials, etc.)
 * @returns The configured adapter instance
 * @throws If the adapter type is not supported
 */
export function getAdapter(
  type: string,
  _config: Record<string, string> = {} // eslint-disable-line @typescript-eslint/no-unused-vars
): TargetSystemAdapter {
  const factory = ADAPTER_TYPES[type];
  if (!factory) {
    const supported = Object.keys(ADAPTER_TYPES).join(", ");
    throw new Error(
      `Unsupported adapter type "${type}". Supported types: ${supported}`
    );
  }
  return factory();
}

export type { TargetSystemAdapter, SecurityDesignSnapshot, SecurityDesignChange, TargetRoleSnapshot } from "./target-system-adapter";

// Constants for the agent graph service. Extracted from the service to satisfy
// the no-inline-declarations rule (apps/api CLAUDE.md rule 13 / audit BE-05).

import { FEATURE_TO_AGENT_MAP } from '../../agent-config/agent-config.constants'

/** Set of agent IDs considered core (derived from FEATURE_TO_AGENT_MAP values). */
export const CORE_AGENT_IDS = new Set(Object.values(FEATURE_TO_AGENT_MAP))

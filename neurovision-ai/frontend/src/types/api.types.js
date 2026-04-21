/**
 * NeuroVision — API Type Definitions (JSDoc)
 * Shape contracts for all API request/response objects.
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean}    ok     - Whether the call succeeded
 * @property {number}    [status] - HTTP status code
 * @property {any}       [data]   - Parsed response body
 * @property {string}    [error]  - Error message if !ok
 */

/**
 * @typedef {Object} HealthResponse
 * @property {string} status   - 'ok' | 'degraded'
 * @property {string} version  - Backend version string
 * @property {number} latency  - Self-measured latency ms
 */

/**
 * @typedef {Object} AnalyzeRequest
 * @property {Blob}   image - Image blob
 * @property {string} goal  - Optimization goal
 */

/**
 * @typedef {Object} AnalyzeApiResponse
 * @property {import('./analysis.types').AnalysisResult} result
 * @property {boolean} fromCache - Whether result was cached
 * @property {number}  processingMs - Backend time
 */

/**
 * @typedef {Object} EnhanceRequest
 * @property {Blob}   image  - Image blob
 * @property {string} filter - Filter name
 * @property {string} goal   - Optimization goal
 */

/**
 * @typedef {Object} EnhanceApiResponse
 * @property {string} imageDataURL - Base64 enhanced image
 * @property {number} qualityDelta - Score improvement
 * @property {string} filterApplied
 */

/**
 * @typedef {Object} ChatRequest
 * @property {string} message    - User message text
 * @property {Object} context    - { quality, scene, goal }
 * @property {string} goal       - Current optimization goal
 */

/**
 * @typedef {Object} ChatApiResponse
 * @property {string}   reply      - AI reply text
 * @property {string}  [action]   - Optional action key to execute
 * @property {string}  [actionLabel] - Human-readable action label
 */

/**
 * @typedef {'free'|'pro'|'team'} PlanType
 */

/**
 * @typedef {Object} UserSession
 * @property {PlanType} plan       - Current plan
 * @property {number}   usedToday  - Analyses used today
 * @property {number}   limitFree  - Free tier daily limit
 * @property {boolean}  batchRunning - Whether batch is active
 * @property {string}   goal       - Current optimization goal
 * @property {boolean}  chatOpen   - Whether chat panel is open
 * @property {boolean}  apiOnline  - Whether backend is reachable
 */

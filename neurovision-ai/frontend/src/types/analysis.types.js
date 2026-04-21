/**
 * NeuroVision — Analysis Type Definitions (JSDoc)
 * Runtime shape documentation for all analysis objects.
 * Use these as @param / @returns annotations throughout codebase.
 */

/**
 * @typedef {Object} ImageMetrics
 * @property {number} avgBright   - Average luminance [0–255]
 * @property {number} stdDev      - Luminance standard deviation (contrast proxy)
 * @property {number} colorfulness - Color spread index
 * @property {number} sharpness   - Laplacian variance (edge crispness)
 * @property {number} avgR        - Average red channel value
 * @property {number} avgG        - Average green channel value
 * @property {number} avgB        - Average blue channel value
 * @property {number} w           - Image width in pixels
 * @property {number} h           - Image height in pixels
 */

/**
 * @typedef {'crit'|'warn'|'ok'} ProblemType
 */

/**
 * @typedef {Object} Problem
 * @property {ProblemType} type    - Severity level
 * @property {string}      icon    - Display emoji
 * @property {string}      label   - Short label shown in UI
 * @property {number}      conf    - Confidence percent [0–100]
 * @property {string}      key     - Unique key ('dark','blur', etc.)
 * @property {string}      raw     - Technical description for raw mode
 * @property {string}      human   - Human-friendly explanation for explain mode
 */

/**
 * @typedef {Object} Detection
 * @property {string} label  - Detected class (e.g., 'person', 'face')
 * @property {number} conf   - Confidence [0–1]
 * @property {string} color  - Hex color for overlay rendering
 * @property {number} x      - Bounding box X [0–1] normalized
 * @property {number} y      - Bounding box Y [0–1] normalized
 * @property {number} w      - Bounding box width [0–1] normalized
 * @property {number} h      - Bounding box height [0–1] normalized
 */

/**
 * @typedef {'night'|'outdoor'|'document'|'vibrant'|'indoor'|'portrait'|'general'} SceneType
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {Problem[]}   problems   - Detected issues sorted by severity
 * @property {Detection[]} detections - Bounding box detections
 * @property {number}      quality    - Quality score [0–100]
 * @property {number}      virality   - Virality score [0–100]
 * @property {SceneType}   scene      - Detected scene type
 * @property {string}      analysisId - Unique run identifier
 * @property {number}      timestamp  - Unix ms
 */

/**
 * @typedef {Object} FilterResult
 * @property {string}  dataURL   - Enhanced image data URL
 * @property {string}  filterName - Applied filter name
 * @property {number}  qualityDelta - Score improvement
 */

/**
 * @typedef {Object} AppState
 * @property {string|null}       origURL     - Original image data URL
 * @property {string|null}       enhancedURL - Enhanced image data URL
 * @property {string|null}       currentURL  - Currently displayed data URL
 * @property {HTMLImageElement|null} origImg - Original image element
 * @property {ImageMetrics|null} metrics     - Pixel metrics
 * @property {AnalysisResult|null} analysis  - Full analysis result
 * @property {number}            zoom        - Current zoom factor
 * @property {boolean}           overlayOn   - Overlay bounding boxes visible
 * @property {boolean}           compareMode - Before/after compare active
 * @property {number}            cmpX        - Compare slider position [0–1]
 * @property {number}            qualBefore  - Quality before auto-fix
 * @property {number}            viralBefore - Virality before auto-fix
 */

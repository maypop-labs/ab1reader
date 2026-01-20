///////////////////////////////////////////////////////////////////////////////
// QualityTrimmer.js
// Algorithm for finding quality-based trim points in sequencing data
// Based on the PHP qualityTrim() algorithm with X-drop style trim-back
///////////////////////////////////////////////////////////////////////////////

/**
 * QualityTrimmer - Utility class for quality-based sequence trimming
 * 
 * Uses centered sliding window (5 before + 5 after) to find trim points.
 * Single forward scan finds both 5' and 3' trim points.
 * 
 * Algorithm:
 * - trimStart = first position where quality >= upperThreshold
 * - trimEnd = last position where quality >= upperThreshold before falling below lowerThreshold
 */
class QualityTrimmer {
    
    /**
     * Find trim points based on quality scores
     * 
     * @param {number[]} qualityScores - Array of quality scores (Phred scores)
     * @param {number} upperThreshold - Quality must reach this to be considered "good" (default 24)
     * @param {number} lowerThreshold - Triggers trim when quality falls below this (default 15)
     * @returns {Object} { trimStart, trimEnd } - 0-based indices
     */
    static findTrimPoints(qualityScores, upperThreshold = 24, lowerThreshold = 15) {
        if (!qualityScores || qualityScores.length === 0) {
            return { trimStart: 0, trimEnd: 0 };
        }
        
        const length = qualityScores.length;
        
        // Need at least 11 bases for centered window (5 + 1 + 5)
        if (length < 11) {
            return { trimStart: 0, trimEnd: length - 1 };
        }
        
        let trimStart = -1;        // First position where quality >= upperThreshold
        let lastGoodPosition = -1; // Last position where quality >= upperThreshold
        let trimEnd = length - 6;  // Default to near end
        let foundFallOff = false;
        
        // Single forward scan from position 5 to length-6
        for (let i = 5; i <= length - 6; i++) {
            const windowAvg = this._centeredWindowAverage(qualityScores, i);
            
            if (windowAvg >= upperThreshold) {
                // First time reaching good quality = trimStart
                if (trimStart === -1) {
                    trimStart = i;
                }
                // Track the most recent good position
                lastGoodPosition = i;
            }
            
            // If we've found good quality and now drop below lower threshold
            if (trimStart !== -1 && windowAvg < lowerThreshold) {
                // Trim back to the last position that was >= upperThreshold
                trimEnd = lastGoodPosition;
                foundFallOff = true;
                break;
            }
        }
        
        // If no good quality found at all, return minimal range
        if (trimStart === -1) {
            return { trimStart: 5, trimEnd: 5 };
        }
        
        // If no fall-off detected, use the last good position or end of valid range
        if (!foundFallOff) {
            trimEnd = lastGoodPosition !== -1 ? lastGoodPosition : length - 6;
        }
        
        return { trimStart, trimEnd };
    }
    
    /**
     * Calculate centered window average (5 before + 5 after, excluding center)
     * Matches the PHP implementation
     * @private
     */
    static _centeredWindowAverage(qualityScores, centerIndex) {
        let sum = 0;
        
        // 5 positions before center
        sum += qualityScores[centerIndex - 5];
        sum += qualityScores[centerIndex - 4];
        sum += qualityScores[centerIndex - 3];
        sum += qualityScores[centerIndex - 2];
        sum += qualityScores[centerIndex - 1];
        
        // 5 positions after center
        sum += qualityScores[centerIndex + 1];
        sum += qualityScores[centerIndex + 2];
        sum += qualityScores[centerIndex + 3];
        sum += qualityScores[centerIndex + 4];
        sum += qualityScores[centerIndex + 5];
        
        return sum / 10;
    }
    
    /**
     * Calculate statistics for quality scores
     * 
     * @param {number[]} qualityScores - Array of quality scores
     * @param {number} start - Start index (optional)
     * @param {number} end - End index (optional)
     * @returns {Object} Statistics object
     */
    static calculateStatistics(qualityScores, start = 0, end = null) {
        if (!qualityScores || qualityScores.length === 0) {
            return {
                min: 0,
                max: 0,
                mean: 0,
                median: 0,
                length: 0
            };
        }
        
        const endIdx = end !== null ? Math.min(end, qualityScores.length - 1) : qualityScores.length - 1;
        const scores = qualityScores.slice(start, endIdx + 1);
        
        if (scores.length === 0) {
            return {
                min: 0,
                max: 0,
                mean: 0,
                median: 0,
                length: 0
            };
        }
        
        const sorted = [...scores].sort((a, b) => a - b);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: mean,
            median: median,
            length: scores.length
        };
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QualityTrimmer };
}

// For use in browser
if (typeof window !== 'undefined') {
    window.QualityTrimmer = QualityTrimmer;
}

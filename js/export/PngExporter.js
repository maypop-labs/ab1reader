///////////////////////////////////////////////////////////////////////////////
// PngExporter.js
// PNG image exporter for chromatogram visualization
///////////////////////////////////////////////////////////////////////////////

/**
 * PngExporter - Utility class for exporting chromatogram as PNG image
 * 
 * Uses NUCLEOTIDE_COLORS from window (set by ChromatogramCanvas.js)
 * Renders the full chromatogram (not just visible portion) at a fixed resolution
 */
class PngExporter {
    
    /**
     * Export chromatogram as PNG blob from file data
     * 
     * @param {Object} fileData - File data object with traces, sequence, etc.
     * @param {Object} options - Export options
     * @param {string} options.viewMode - 'processed', 'raw', or 'quality' (default: 'processed')
     * @param {number} options.pixelsPerBase - Pixels per base for rendering (default: 12)
     * @param {number} options.height - Canvas height in pixels (default: 450)
     * @returns {Promise<Blob>} PNG blob
     */
    static async exportFromFileData(fileData, options = {}) {
        if (!fileData) {
            throw new Error('File data is required');
        }
        
        if (!fileData.sequence || !fileData.traces) {
            throw new Error('File data must contain sequence and traces');
        }
        
        const viewMode = options.viewMode || 'processed';
        const pixelsPerBase = options.pixelsPerBase || 12;
        const height = options.height || 450;
        
        // Calculate canvas dimensions
        const sequenceLength = fileData.sequence.length;
        const width = Math.max(800, sequenceLength * pixelsPerBase); // Minimum 800px width
        
        // Limit maximum canvas size to prevent memory issues
        const maxWidth = 50000;
        const maxHeight = 10000;
        const actualWidth = Math.min(width, maxWidth);
        const actualHeight = Math.min(height, maxHeight);
        
        // Warn if we're limiting the size
        if (width > maxWidth || height > maxHeight) {
            console.warn(`Canvas size limited from ${width}x${height} to ${actualWidth}x${actualHeight}`);
        }
        
        // Create offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context from canvas');
        }
        
        // Render configuration (matching ChromatogramCanvas defaults)
        // Adjust traceAreaHeight if canvas is limited
        const adjustedTraceAreaHeight = Math.min(350, actualHeight - 100); // Leave room for base calls
        const config = {
            height: actualHeight,
            traceAreaHeight: adjustedTraceAreaHeight,
            baseCallHeight: 50,
            qualityBarMaxHeight: 100,
            traceLineWidth: 1.5,
            backgroundColor: '#FFFFFF',
            baselineColor: '#CCCCCC',
            baseFontSize: 14,
            baseFont: 'bold 14px "Consolas", "Monaco", monospace',
            highQualityThreshold: 30,
            lowQualityThreshold: 15
        };
        
        // Calculate trace maximum for Y-axis scaling
        const tracesToCheck = viewMode === 'raw' && fileData.rawTraces 
            ? fileData.rawTraces 
            : fileData.traces;
        
        let traceMax = 0;
        const channelOrder = fileData.channelOrder || ['G', 'A', 'T', 'C'];
        
        for (const nucleotide of channelOrder) {
            const trace = tracesToCheck[nucleotide];
            if (trace) {
                for (const value of trace) {
                    if (value > traceMax) {
                        traceMax = value;
                    }
                }
            }
        }
        
        const traceAreaHeight = config.traceAreaHeight - 10;
        const yScale = traceAreaHeight / (traceMax || 1);
        
        // Clear canvas with background
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, actualWidth, actualHeight);
        
        // Calculate X scale (pixels per data point)
        // Find max trace length
        let maxTraceLength = 0;
        for (const nucleotide of channelOrder) {
            const trace = tracesToCheck[nucleotide];
            if (trace && trace.length > maxTraceLength) {
                maxTraceLength = trace.length;
            }
        }
        
        // X scale: map trace data points to canvas pixels
        // We want the full sequence to fit, so use peak locations to determine scale
        let xScale = pixelsPerBase;
        if (fileData.peakLocations && fileData.peakLocations.length > 0) {
            const lastPeak = fileData.peakLocations[fileData.peakLocations.length - 1];
            if (lastPeak > 0) {
                // Scale so last peak maps to approximate position based on pixelsPerBase
                const lastBaseX = (sequenceLength - 1) * pixelsPerBase;
                xScale = lastBaseX / lastPeak;
            }
        }
        
        // Render based on view mode
        switch (viewMode) {
            case 'quality':
                this._renderQualityBars(ctx, fileData, config, xScale, yScale, actualWidth, channelOrder);
                this._renderBaseline(ctx, config, actualWidth);
                this._renderBaseCalls(ctx, fileData, config, xScale, channelOrder);
                break;
                
            case 'raw':
                if (!fileData.rawTraces) {
                    throw new Error('Raw traces not available');
                }
                this._renderTraces(ctx, fileData.rawTraces, config, xScale, yScale, channelOrder);
                this._renderBaseline(ctx, config, actualWidth);
                break;
                
            case 'processed':
            default:
                this._renderTraces(ctx, fileData.traces, config, xScale, yScale, channelOrder);
                this._renderBaseline(ctx, config, actualWidth);
                this._renderBaseCalls(ctx, fileData, config, xScale, channelOrder);
                // Render ruler/position numbers
                this._renderRuler(ctx, fileData, config, xScale, actualWidth);
                break;
        }
        
        // Convert canvas to blob with error handling
        return new Promise((resolve, reject) => {
            try {
                // Check if toBlob is available
                if (typeof canvas.toBlob !== 'function') {
                    // Fallback: use toDataURL and convert manually
                    const dataURL = canvas.toDataURL('image/png');
                    if (!dataURL || dataURL === 'data:,') {
                        reject(new Error('Failed to convert canvas to data URL'));
                        return;
                    }
                    // Convert data URL to blob manually (no fetch needed)
                    const byteString = atob(dataURL.split(',')[1]);
                    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    resolve(blob);
                    return;
                }
                
                // Use toBlob if available
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas.toBlob returned null - possibly due to canvas size limits or memory constraints'));
                    }
                }, 'image/png');
            } catch (error) {
                reject(new Error('Exception in canvas.toBlob: ' + error.message));
            }
        });
    }
    
    /**
     * Render trace lines for all channels
     * @private
     */
    static _renderTraces(ctx, traces, config, xScale, yScale, channelOrder) {
        if (!traces) return;
        
        const traceAreaHeight = config.traceAreaHeight;
        
        // Render in reverse order for proper layering (higher peaks on top)
        const renderOrder = [...channelOrder].reverse();
        
        for (const nucleotide of renderOrder) {
            const trace = traces[nucleotide];
            if (!trace || trace.length === 0) continue;
            
            const color = NUCLEOTIDE_COLORS[nucleotide] || '#000000';
            
            ctx.strokeStyle = color;
            ctx.lineWidth = config.traceLineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            let started = false;
            
            for (let i = 0; i < trace.length; i++) {
                const x = i * xScale;
                const y = traceAreaHeight - (trace[i] * yScale);
                
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
        }
    }
    
    /**
     * Render base call letters below the traces
     * @private
     */
    static _renderBaseCalls(ctx, fileData, config, xScale, channelOrder) {
        if (!fileData.sequence || !fileData.peakLocations) return;
        
        const baseY = config.traceAreaHeight + (config.baseCallHeight / 2) + 5;
        
        ctx.font = config.baseFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < fileData.sequence.length; i++) {
            const base = fileData.sequence[i];
            const peakX = fileData.peakLocations[i];
            
            if (peakX === undefined) continue;
            
            const x = peakX * xScale;
            const color = NUCLEOTIDE_COLORS[base] || NUCLEOTIDE_COLORS['N'];
            
            // Draw base letter
            ctx.fillStyle = color;
            ctx.fillText(base, x, baseY);
        }
    }
    
    /**
     * Render quality score bars
     * @private
     */
    static _renderQualityBars(ctx, fileData, config, xScale, yScale, width, channelOrder) {
        if (!fileData.qualityScores || !fileData.peakLocations) return;
        
        const maxHeight = config.qualityBarMaxHeight;
        const traceAreaHeight = config.traceAreaHeight;
        const barWidth = Math.max(2, xScale * 0.8);
        
        for (let i = 0; i < fileData.qualityScores.length; i++) {
            const quality = fileData.qualityScores[i];
            const peakX = fileData.peakLocations[i];
            
            if (peakX === undefined) continue;
            
            const x = (peakX * xScale) - (barWidth / 2);
            const barHeight = (quality / 60) * maxHeight;
            const y = traceAreaHeight - barHeight;
            
            // Color based on quality
            let color;
            if (quality >= config.highQualityThreshold) {
                color = '#00AA00'; // Green - high quality
            } else if (quality >= config.lowQualityThreshold) {
                color = '#FFAA00'; // Orange - medium quality
            } else {
                color = '#FF0000'; // Red - low quality
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }
    
    /**
     * Render the baseline separator
     * @private
     */
    static _renderBaseline(ctx, config, width) {
        const y = config.traceAreaHeight;
        
        ctx.strokeStyle = config.baselineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    /**
     * Render position numbers (ruler) every 10 bases
     * @private
     */
    static _renderRuler(ctx, fileData, config, xScale, width) {
        if (!fileData.sequence || !fileData.peakLocations) return;
        
        const baseY = config.traceAreaHeight + (config.baseCallHeight / 2) + 5;
        
        ctx.fillStyle = '#888888';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < fileData.sequence.length; i++) {
            // Draw position number every 10 bases
            if ((i + 1) % 10 === 0) {
                const peakX = fileData.peakLocations[i];
                if (peakX !== undefined) {
                    const x = peakX * xScale;
                    ctx.fillText((i + 1).toString(), x, baseY + 18);
                }
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PngExporter };
}

// For use in browser - must match exactly how FastaExporter and FastqExporter do it
if (typeof window !== 'undefined') {
    window.PngExporter = PngExporter;
}

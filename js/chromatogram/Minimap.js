///////////////////////////////////////////////////////////////////////////////
// Minimap.js
// Overview minimap component for chromatogram navigation
///////////////////////////////////////////////////////////////////////////////

/**
 * Minimap - Provides an overview of the entire chromatogram
 * Shows current viewport position and allows click-to-navigate
 */
class Minimap {
    
    /**
     * Create a Minimap instance
     * @param {HTMLElement} container - Container element for the minimap
     * @param {Object} options - Configuration options
     */
    constructor(container, options = {}) {
        if (!container) {
            throw new Error('Minimap requires a container element');
        }
        
        this.container = container;
        this.config = {
            height: options.height || 40,
            backgroundColor: options.backgroundColor || '#f5f5f5',
            viewportColor: options.viewportColor || 'rgba(100, 150, 255, 0.4)',
            viewportBorderColor: options.viewportBorderColor || 'rgba(100, 150, 255, 0.8)',
            traceColor: options.traceColor || '#888888',
            selectionColor: options.selectionColor || 'rgba(100, 150, 255, 0.5)',
            searchHighlightColor: options.searchHighlightColor || 'rgba(255, 200, 0, 0.7)'
        };
        
        // Data
        this.traces = null;
        this.channelOrder = ['G', 'A', 'T', 'C'];
        this.traceLength = 0;
        
        // View state (synced from main chromatogram)
        this.viewportStart = 0;
        this.viewportEnd = 100;
        this.totalWidth = 0;
        
        // Selection state
        this.selection = { start: -1, end: -1 };
        this.peakLocations = [];
        
        // Search matches
        this.searchMatches = [];
        
        // Callbacks
        this.onNavigate = null;  // Called when user clicks minimap
        
        // Create canvas
        this._createCanvas();
        
        // Bind events
        this._bindEvents();
    }
    
    /**
     * Create the canvas element
     * @private
     */
    _createCanvas() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.cursor = 'pointer';
        
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            display: block;
            width: 100%;
            height: ${this.config.height}px;
            border-radius: 4px;
        `;
        this.container.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        
        this._updateSize();
    }
    
    /**
     * Update canvas size to match container
     * @private
     */
    _updateSize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = this.config.height;
    }
    
    /**
     * Bind event listeners
     * @private
     */
    _bindEvents() {
        // Click to navigate
        this.canvas.addEventListener('click', (e) => this._onClick(e));
        
        // Drag to navigate
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        
        // Resize observer
        this.resizeObserver = new ResizeObserver(() => {
            this._updateSize();
            this.render();
        });
        this.resizeObserver.observe(this.container);
    }
    
    /**
     * Handle click on minimap
     * @param {MouseEvent} e
     * @private
     */
    _onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = x / this.canvas.width;
        
        // Calculate data position
        const dataX = ratio * this.traceLength;
        
        if (this.onNavigate) {
            this.onNavigate(dataX);
        }
    }
    
    /**
     * Handle mouse down for drag navigation
     * @param {MouseEvent} e
     * @private
     */
    _onMouseDown(e) {
        const onMouseMove = (moveEvent) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, this.canvas.width));
            const ratio = x / this.canvas.width;
            const dataX = ratio * this.traceLength;
            
            if (this.onNavigate) {
                this.onNavigate(dataX);
            }
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    /**
     * Load trace data for rendering
     * @param {Object} traces - Trace data object
     * @param {Array} peakLocations - Peak location array
     */
    loadData(traces, peakLocations) {
        this.traces = traces;
        this.peakLocations = peakLocations || [];
        
        // Find trace length
        this.traceLength = 0;
        for (const nucleotide of this.channelOrder) {
            if (traces[nucleotide] && traces[nucleotide].length > this.traceLength) {
                this.traceLength = traces[nucleotide].length;
            }
        }
        
        this.render();
    }
    
    /**
     * Update viewport position (synced from main chromatogram)
     * @param {number} startX - Visible start X in data coordinates
     * @param {number} endX - Visible end X in data coordinates
     */
    updateViewport(startX, endX) {
        this.viewportStart = startX;
        this.viewportEnd = endX;
        this.render();
    }
    
    /**
     * Update selection display
     * @param {number} start - Selection start index
     * @param {number} end - Selection end index
     */
    updateSelection(start, end) {
        this.selection = { start, end };
        this.render();
    }
    
    /**
     * Update search match highlights
     * @param {Array} matches - Array of {start, end} match objects
     */
    updateSearchMatches(matches) {
        this.searchMatches = matches || [];
        this.render();
    }
    
    /**
     * Render the minimap
     */
    render() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear
        ctx.fillStyle = this.config.backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        if (!this.traces || this.traceLength === 0) {
            this._renderEmptyState();
            return;
        }
        
        // Draw search highlights
        this._renderSearchHighlights();
        
        // Draw selection
        this._renderSelection();
        
        // Draw trace overview
        this._renderTraceOverview();
        
        // Draw viewport indicator
        this._renderViewport();
        
        // Draw border
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    }
    
    /**
     * Render empty state
     * @private
     */
    _renderEmptyState() {
        const ctx = this.ctx;
        ctx.fillStyle = '#888';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data', this.canvas.width / 2, this.canvas.height / 2);
    }
    
    /**
     * Render simplified trace overview
     * @private
     */
    _renderTraceOverview() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Calculate scale
        const xScale = width / this.traceLength;
        
        // Find max value for Y scaling
        let maxValue = 0;
        for (const nucleotide of this.channelOrder) {
            const trace = this.traces[nucleotide];
            if (trace) {
                for (const v of trace) {
                    if (v > maxValue) maxValue = v;
                }
            }
        }
        
        const yScale = (height - 10) / (maxValue || 1);
        
        // Downsample and render combined trace
        ctx.strokeStyle = this.config.traceColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Calculate step size for downsampling
        const step = Math.max(1, Math.floor(this.traceLength / width));
        
        let started = false;
        for (let i = 0; i < this.traceLength; i += step) {
            // Get max value at this position across all channels
            let value = 0;
            for (const nucleotide of this.channelOrder) {
                const trace = this.traces[nucleotide];
                if (trace && trace[i] > value) {
                    value = trace[i];
                }
            }
            
            const x = i * xScale;
            const y = height - 5 - (value * yScale);
            
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }
    
    /**
     * Render viewport indicator
     * @private
     */
    _renderViewport() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Convert data coordinates to canvas coordinates
        const xScale = width / this.traceLength;
        const startX = this.viewportStart * xScale;
        const endX = this.viewportEnd * xScale;
        const viewportWidth = Math.max(10, endX - startX); // Minimum width
        
        // Draw viewport rectangle
        ctx.fillStyle = this.config.viewportColor;
        ctx.fillRect(startX, 0, viewportWidth, height);
        
        // Draw viewport border
        ctx.strokeStyle = this.config.viewportBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, 0, viewportWidth, height);
    }
    
    /**
     * Render selection highlight
     * @private
     */
    _renderSelection() {
        if (this.selection.start < 0 || !this.peakLocations.length) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const xScale = width / this.traceLength;
        
        const startX = this.peakLocations[this.selection.start] * xScale;
        const endX = this.peakLocations[this.selection.end] * xScale;
        
        ctx.fillStyle = this.config.selectionColor;
        ctx.fillRect(startX, 0, endX - startX, height);
    }
    
    /**
     * Render search match highlights
     * @private
     */
    _renderSearchHighlights() {
        if (this.searchMatches.length === 0 || !this.peakLocations.length) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const xScale = width / this.traceLength;
        
        ctx.fillStyle = this.config.searchHighlightColor;
        
        for (const match of this.searchMatches) {
            const startX = this.peakLocations[match.start] * xScale;
            const endX = this.peakLocations[match.end] * xScale;
            const matchWidth = Math.max(2, endX - startX);
            
            ctx.fillRect(startX, 0, matchWidth, height);
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        this.canvas.remove();
        this.traces = null;
        this.ctx = null;
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Minimap };
}

// For use in browser
if (typeof window !== 'undefined') {
    window.Minimap = Minimap;
}

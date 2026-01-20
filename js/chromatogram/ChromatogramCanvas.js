///////////////////////////////////////////////////////////////////////////////
// ChromatogramCanvas.js
// Main chromatogram visualization component for AB1 files
///////////////////////////////////////////////////////////////////////////////

/**
 * Standard nucleotide colors for Sanger sequencing
 */
const NUCLEOTIDE_COLORS = {
    'G': '#000000',  // Black
    'A': '#00CC00',  // Green
    'T': '#FF0000',  // Red
    'C': '#0000FF',  // Blue
    'N': '#808080'   // Gray
};

/**
 * Default configuration for chromatogram display
 */
const DEFAULT_CONFIG = {
    // Dimensions
    height: 400,
    traceAreaHeight: 300,      // Height for trace rendering
    baseCallHeight: 50,        // Height for base call display
    qualityBarMaxHeight: 100,  // Max height for quality bars
    
    // Scaling
    xScale: 2,                 // Pixels per data point
    minXScale: 0.5,            // Minimum zoom level
    maxXScale: 10,             // Maximum zoom level
    
    // Appearance
    traceLineWidth: 1.5,
    backgroundColor: '#FFFFFF',
    baselineColor: '#CCCCCC',
    selectionColor: 'rgba(100, 150, 255, 0.3)',
    searchHighlightColor: 'rgba(255, 200, 0, 0.5)',
    currentMatchColor: 'rgba(255, 100, 0, 0.6)',
    
    // Base call display
    baseFontSize: 14,
    baseFont: 'bold 14px "Consolas", "Monaco", monospace',
    
    // Quality thresholds
    highQualityThreshold: 30,
    lowQualityThreshold: 15
};

/**
 * ChromatogramCanvas - Main visualization class
 * Renders Sanger sequencing chromatogram traces with base calls
 */
class ChromatogramCanvas {
    
    /**
     * Create a ChromatogramCanvas instance
     * @param {HTMLElement} container - Container element for the canvas
     * @param {Object} options - Configuration options
     */
    constructor(container, options = {}) {
        if (!container) {
            throw new Error('ChromatogramCanvas requires a container element');
        }
        
        this.container = container;
        this.config = { ...DEFAULT_CONFIG, ...options };
        
        // Data
        this.data = null;
        this.traces = null;
        this.sequence = '';
        this.peakLocations = [];
        this.qualityScores = [];
        this.channelOrder = ['G', 'A', 'T', 'C'];
        
        // View state
        this.scrollX = 0;
        this.xScale = this.config.xScale;
        this.viewMode = 'processed';  // 'processed', 'raw', 'quality'
        
        // Selection state
        this.selection = { start: -1, end: -1 };
        this.hoveredBase = -1;
        
        // Drag selection state
        this.isDragging = false;
        this.dragStartBase = -1;
        this.dragCurrentBase = -1;
        
        // Search state
        this.searchMatches = [];      // Array of {start, end} for each match
        this.currentMatchIndex = -1;  // Currently highlighted match
        
        // Modification tracking
        this.modifications = new Set(); // Set of modified base indices
        
        // Computed values
        this.traceMax = 0;
        this.yScale = 1;
        this.totalWidth = 0;
        
        // Create canvas elements
        this._createCanvases();
        
        // Bind event handlers
        this._bindEvents();
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // INITIALIZATION
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Create the canvas elements
     * @private
     */
    _createCanvases() {
        // Clear container
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        
        // Create wrapper for scrolling
        this.wrapper = document.createElement('div');
        this.wrapper.style.cssText = `
            position: relative;
            width: 100%;
            height: ${this.config.height}px;
            overflow-x: auto;
            overflow-y: hidden;
        `;
        this.container.appendChild(this.wrapper);
        
        // Create main canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
            display: block;
            cursor: crosshair;
        `;
        this.wrapper.appendChild(this.canvas);
        
        // Get contexts
        this.ctx = this.canvas.getContext('2d');
        
        // Set initial size
        this._updateCanvasSize();
    }
    
    /**
     * Update canvas size based on data and zoom level
     * @private
     */
    _updateCanvasSize() {
        const containerWidth = this.container.clientWidth;
        
        if (this.traces && this.traces.G) {
            this.totalWidth = Math.ceil(this.traces.G.length * this.xScale);
        } else {
            this.totalWidth = containerWidth;
        }
        
        // Canvas width is the larger of container or data width
        const canvasWidth = Math.max(this.totalWidth, containerWidth);
        
        this.canvas.width = canvasWidth;
        this.canvas.height = this.config.height;
        
        // Update wrapper to enable scrolling if needed
        if (this.totalWidth > containerWidth) {
            this.wrapper.style.overflowX = 'auto';
        } else {
            this.wrapper.style.overflowX = 'hidden';
        }
    }
    
    /**
     * Bind mouse and keyboard events
     * @private
     */
    _bindEvents() {
        // Mouse move for hover effects and drag selection
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        
        // Mouse leave
        this.canvas.addEventListener('mouseleave', () => this._onMouseLeave());
        
        // Mouse down for drag selection start
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        
        // Mouse up for drag selection end
        this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        
        // Click for base selection (handled in mouseup if not dragging)
        
        // Scroll event
        this.wrapper.addEventListener('scroll', () => this._onScroll());
        
        // Prevent text selection during drag
        this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
        
        // Resize observer
        this.resizeObserver = new ResizeObserver(() => {
            this._updateCanvasSize();
            this.render();
        });
        this.resizeObserver.observe(this.container);
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // DATA LOADING
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Load chromatogram data
     * @param {Object} data - Parsed ABIF data object
     */
    loadData(data) {
        this.data = data;
        this.traces = data.traces;
        this.sequence = data.sequence || '';
        this.peakLocations = data.peakLocations || [];
        this.qualityScores = data.qualityScores || [];
        this.channelOrder = data.channelOrder || ['G', 'A', 'T', 'C'];
        
        // Calculate trace maximum for scaling
        this._calculateTraceMax();
        
        // Update canvas size
        this._updateCanvasSize();
        
        // Reset view
        this.scrollX = 0;
        this.wrapper.scrollLeft = 0;
        
        // Clear search
        this.clearSearch();
        
        // Clear modifications when loading new data
        this.modifications.clear();
        
        // Render
        this.render();
    }
    
    /**
     * Load raw trace data (alternative view)
     * @param {Object} rawTraces - Raw trace data object
     */
    loadRawTraces(rawTraces) {
        this.rawTraces = rawTraces;
        if (this.viewMode === 'raw') {
            this.render();
        }
    }
    
    /**
     * Calculate the maximum trace value for Y-axis scaling
     * @private
     */
    _calculateTraceMax() {
        this.traceMax = 0;
        
        const tracesToCheck = this.viewMode === 'raw' ? this.rawTraces : this.traces;
        
        if (!tracesToCheck) return;
        
        for (const nucleotide of this.channelOrder) {
            const trace = tracesToCheck[nucleotide];
            if (trace) {
                for (const value of trace) {
                    if (value > this.traceMax) {
                        this.traceMax = value;
                    }
                }
            }
        }
        
        // Calculate Y scale to fit traces in trace area
        const traceAreaHeight = this.config.traceAreaHeight - 10; // Leave margin
        this.yScale = traceAreaHeight / (this.traceMax || 1);
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // RENDERING
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Main render function
     */
    render() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = this.config.backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        if (!this.traces) {
            this._renderEmptyState();
            return;
        }
        
        // Render search highlights first (behind everything)
        this._renderSearchHighlights();
        
        // Render selection (behind traces but above search)
        if (this.selection.start >= 0) {
            this._renderSelection();
        }
        
        // Render drag selection preview
        if (this.isDragging && this.dragStartBase >= 0) {
            this._renderDragSelection();
        }
        
        // Render components based on view mode
        switch (this.viewMode) {
            case 'quality':
                this._renderQualityBars();
                this._renderBaseline();
                this._renderBaseCalls();
                break;
                
            case 'raw':
                this._renderTraces(this.rawTraces);
                this._renderBaseline();
                break;
                
            case 'processed':
            default:
                this._renderTraces(this.traces);
                this._renderBaseline();
                this._renderBaseCalls();
                break;
        }
        
        // Render hover highlight (on top)
        if (this.hoveredBase >= 0 && !this.isDragging) {
            this._renderHoveredBase();
        }
    }
    
    /**
     * Render empty state message
     * @private
     */
    _renderEmptyState() {
        const ctx = this.ctx;
        ctx.fillStyle = '#888888';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            'No chromatogram data loaded. Open an AB1 file to begin.',
            this.canvas.width / 2,
            this.canvas.height / 2
        );
    }
    
    /**
     * Render the baseline separator
     * @private
     */
    _renderBaseline() {
        const ctx = this.ctx;
        const y = this.config.traceAreaHeight;
        
        ctx.strokeStyle = this.config.baselineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.canvas.width, y);
        ctx.stroke();
    }
    
    /**
     * Render trace lines for all channels
     * @param {Object} traces - Trace data object with G, A, T, C arrays
     * @private
     */
    _renderTraces(traces) {
        if (!traces) return;
        
        const ctx = this.ctx;
        const traceAreaHeight = this.config.traceAreaHeight;
        
        // Render in specific order for proper layering
        // Render lower peaks first, higher peaks on top
        const renderOrder = [...this.channelOrder].reverse();
        
        for (const nucleotide of renderOrder) {
            const trace = traces[nucleotide];
            if (!trace || trace.length === 0) continue;
            
            const color = NUCLEOTIDE_COLORS[nucleotide] || '#000000';
            
            ctx.strokeStyle = color;
            ctx.lineWidth = this.config.traceLineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            let started = false;
            
            for (let i = 0; i < trace.length; i++) {
                const x = i * this.xScale;
                // Y is inverted (0 at top) and offset from top
                const y = traceAreaHeight - (trace[i] * this.yScale);
                
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
    _renderBaseCalls() {
        if (!this.sequence || !this.peakLocations) return;
        
        const ctx = this.ctx;
        const baseY = this.config.traceAreaHeight + (this.config.baseCallHeight / 2) + 5;
        
        ctx.font = this.config.baseFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < this.sequence.length; i++) {
            const base = this.sequence[i];
            const peakX = this.peakLocations[i];
            
            if (peakX === undefined) continue;
            
            const x = peakX * this.xScale;
            const color = NUCLEOTIDE_COLORS[base] || NUCLEOTIDE_COLORS['N'];
            
            // Draw modification indicator (behind base letter)
            if (this.modifications.has(i)) {
                ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
                ctx.beginPath();
                ctx.arc(x, baseY, 10, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw base letter
            ctx.fillStyle = color;
            ctx.fillText(base, x, baseY);
            
            // Draw position number every 10 bases
            if ((i + 1) % 10 === 0) {
                ctx.fillStyle = '#888888';
                ctx.font = '10px sans-serif';
                ctx.fillText((i + 1).toString(), x, baseY + 18);
                ctx.font = this.config.baseFont;
            }
        }
    }
    
    /**
     * Render quality score bars
     * @private
     */
    _renderQualityBars() {
        if (!this.qualityScores || !this.peakLocations) return;
        
        const ctx = this.ctx;
        const maxHeight = this.config.qualityBarMaxHeight;
        const traceAreaHeight = this.config.traceAreaHeight;
        const barWidth = Math.max(2, this.xScale * 0.8);
        
        for (let i = 0; i < this.qualityScores.length; i++) {
            const quality = this.qualityScores[i];
            const peakX = this.peakLocations[i];
            
            if (peakX === undefined) continue;
            
            const x = (peakX * this.xScale) - (barWidth / 2);
            const barHeight = (quality / 60) * maxHeight; // Normalize to max ~60
            const y = traceAreaHeight - barHeight;
            
            // Color based on quality
            let color;
            if (quality >= this.config.highQualityThreshold) {
                color = '#00AA00'; // Green - high quality
            } else if (quality >= this.config.lowQualityThreshold) {
                color = '#FFAA00'; // Orange - medium quality
            } else {
                color = '#FF0000'; // Red - low quality
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw quality value on top of bar
            if (this.xScale >= 3) {
                ctx.fillStyle = '#333333';
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(quality.toString(), peakX * this.xScale, y - 3);
            }
        }
    }
    
    /**
     * Render hovered base highlight
     * @private
     */
    _renderHoveredBase() {
        if (this.hoveredBase < 0 || this.hoveredBase >= this.peakLocations.length) return;
        
        const ctx = this.ctx;
        const peakX = this.peakLocations[this.hoveredBase];
        const x = peakX * this.xScale;
        
        // Draw vertical highlight line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.config.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Highlight the base
        const baseY = this.config.traceAreaHeight + (this.config.baseCallHeight / 2) + 5;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(x, baseY, 12, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render selection highlight
     * @private
     */
    _renderSelection() {
        if (this.selection.start < 0) return;
        
        const ctx = this.ctx;
        const start = Math.min(this.selection.start, this.selection.end);
        const end = Math.max(this.selection.start, this.selection.end);
        
        const startX = this.peakLocations[start] * this.xScale;
        const endX = this.peakLocations[end] * this.xScale;
        
        ctx.fillStyle = this.config.selectionColor;
        ctx.fillRect(
            startX - 5,
            0,
            (endX - startX) + 10,
            this.config.height
        );
    }
    
    /**
     * Render drag selection preview
     * @private
     */
    _renderDragSelection() {
        if (this.dragStartBase < 0 || this.dragCurrentBase < 0) return;
        
        const ctx = this.ctx;
        const start = Math.min(this.dragStartBase, this.dragCurrentBase);
        const end = Math.max(this.dragStartBase, this.dragCurrentBase);
        
        const startX = this.peakLocations[start] * this.xScale;
        const endX = this.peakLocations[end] * this.xScale;
        
        // Draw with dashed outline to indicate it's a preview
        ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';
        ctx.fillRect(startX - 5, 0, (endX - startX) + 10, this.config.height);
        
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(startX - 5, 0, (endX - startX) + 10, this.config.height);
        ctx.setLineDash([]);
    }
    
    /**
     * Render search match highlights
     * @private
     */
    _renderSearchHighlights() {
        if (this.searchMatches.length === 0) return;
        
        const ctx = this.ctx;
        
        for (let i = 0; i < this.searchMatches.length; i++) {
            const match = this.searchMatches[i];
            const startX = this.peakLocations[match.start] * this.xScale;
            const endX = this.peakLocations[match.end] * this.xScale;
            
            // Use different color for current match
            if (i === this.currentMatchIndex) {
                ctx.fillStyle = this.config.currentMatchColor;
            } else {
                ctx.fillStyle = this.config.searchHighlightColor;
            }
            
            ctx.fillRect(
                startX - 3,
                0,
                (endX - startX) + 6,
                this.config.height
            );
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // INTERACTION HANDLERS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Handle mouse move for hover effects and drag selection
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    _onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + this.wrapper.scrollLeft;
        
        // Find nearest base
        const baseIndex = this._findNearestBase(x);
        
        // Handle drag selection
        if (this.isDragging) {
            if (baseIndex !== this.dragCurrentBase && baseIndex >= 0) {
                this.dragCurrentBase = baseIndex;
                this.render();
            }
            
            // Auto-scroll when dragging near edges
            this._autoScrollDuringDrag(e.clientX, rect);
            return;
        }
        
        // Normal hover
        if (baseIndex !== this.hoveredBase) {
            this.hoveredBase = baseIndex;
            this.render();
            
            // Emit hover event
            if (this.onBaseHover) {
                this.onBaseHover(baseIndex, this._getBaseInfo(baseIndex));
            }
        }
    }
    
    /**
     * Handle mouse leave
     * @private
     */
    _onMouseLeave() {
        if (this.hoveredBase >= 0 && !this.isDragging) {
            this.hoveredBase = -1;
            this.render();
        }
    }
    
    /**
     * Handle mouse down for drag selection
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    _onMouseDown(e) {
        // Only left mouse button
        if (e.button !== 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + this.wrapper.scrollLeft;
        const baseIndex = this._findNearestBase(x);
        
        if (baseIndex >= 0) {
            this.isDragging = true;
            this.dragStartBase = baseIndex;
            this.dragCurrentBase = baseIndex;
            this.canvas.style.cursor = 'text';
            
            // Clear existing selection when starting new drag
            this.selection = { start: -1, end: -1 };
            this.render();
        }
    }
    
    /**
     * Handle mouse up for drag selection end
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    _onMouseUp(e) {
        if (!this.isDragging) {
            // Regular click - emit click event
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + this.wrapper.scrollLeft;
            const baseIndex = this._findNearestBase(x);
            
            if (baseIndex >= 0 && this.onBaseClick) {
                const info = this._getBaseInfo(baseIndex);
                // Add click coordinates to info for popover positioning
                info.clickX = e.clientX;
                info.clickY = e.clientY;
                this.onBaseClick(baseIndex, info);
            }
            return;
        }
        
        this.canvas.style.cursor = 'crosshair';
        
        // Check if this was actually a drag (moved more than 0 bases)
        if (this.dragStartBase !== this.dragCurrentBase) {
            // Set selection from drag
            const start = Math.min(this.dragStartBase, this.dragCurrentBase);
            const end = Math.max(this.dragStartBase, this.dragCurrentBase);
            this.selection = { start, end };
            
            // Emit selection change event
            if (this.onSelectionChange) {
                this.onSelectionChange(start, end, this.getSelectedSequence());
            }
        } else {
            // Single click - could emit click event or set single-base selection
            if (this.onBaseClick) {
                const info = this._getBaseInfo(this.dragStartBase);
                // Add click coordinates to info for popover positioning
                info.clickX = e.clientX;
                info.clickY = e.clientY;
                this.onBaseClick(this.dragStartBase, info);
            }
        }
        
        // Reset drag state
        this.isDragging = false;
        this.dragStartBase = -1;
        this.dragCurrentBase = -1;
        
        this.render();
    }
    
    /**
     * Auto-scroll when dragging near edges
     * @param {number} clientX - Mouse X position
     * @param {DOMRect} rect - Canvas bounding rect
     * @private
     */
    _autoScrollDuringDrag(clientX, rect) {
        const edgeThreshold = 50;
        const scrollSpeed = 10;
        
        const relativeX = clientX - rect.left;
        
        if (relativeX < edgeThreshold) {
            // Near left edge - scroll left
            this.wrapper.scrollLeft -= scrollSpeed;
        } else if (relativeX > rect.width - edgeThreshold) {
            // Near right edge - scroll right
            this.wrapper.scrollLeft += scrollSpeed;
        }
    }
    
    /**
     * Handle scroll event
     * @private
     */
    _onScroll() {
        this.scrollX = this.wrapper.scrollLeft;
        
        if (this.onScroll) {
            this.onScroll(this.scrollX, this.getViewInfo());
        }
    }
    
    /**
     * Find the nearest base to an x-coordinate
     * @param {number} x - X coordinate in canvas space
     * @returns {number} Base index or -1 if not found
     * @private
     */
    _findNearestBase(x) {
        if (!this.peakLocations || this.peakLocations.length === 0) return -1;
        
        const dataX = x / this.xScale;
        let nearest = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < this.peakLocations.length; i++) {
            const distance = Math.abs(this.peakLocations[i] - dataX);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = i;
            }
        }
        
        // Only return if within reasonable distance (more lenient during drag)
        const threshold = this.isDragging ? 100 / this.xScale : 20 / this.xScale;
        return minDistance <= threshold ? nearest : -1;
    }
    
    /**
     * Get information about a specific base
     * @param {number} index - Base index
     * @returns {Object} Base information
     * @private
     */
    _getBaseInfo(index) {
        if (index < 0 || index >= this.sequence.length) return null;
        
        return {
            index: index,
            position: index + 1, // 1-based position
            base: this.sequence[index],
            peakLocation: this.peakLocations[index],
            quality: this.qualityScores[index],
            traces: this._getTraceValuesAtPeak(index)
        };
    }
    
    /**
     * Get trace values at a peak position
     * @param {number} baseIndex - Base index
     * @returns {Object} Trace values for each channel
     * @private
     */
    _getTraceValuesAtPeak(baseIndex) {
        const peakX = this.peakLocations[baseIndex];
        if (peakX === undefined || !this.traces) return null;
        
        const values = {};
        for (const nucleotide of this.channelOrder) {
            const trace = this.traces[nucleotide];
            if (trace && trace[peakX] !== undefined) {
                values[nucleotide] = trace[peakX];
            }
        }
        return values;
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // SEARCH METHODS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Search for a sequence pattern
     * @param {string} pattern - Sequence to search for (case-insensitive)
     * @returns {number} Number of matches found
     */
    search(pattern) {
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        
        if (!pattern || !this.sequence) {
            this.render();
            return 0;
        }
        
        const upperPattern = pattern.toUpperCase();
        const upperSequence = this.sequence.toUpperCase();
        
        // Find all occurrences
        let startIndex = 0;
        while (true) {
            const index = upperSequence.indexOf(upperPattern, startIndex);
            if (index === -1) break;
            
            this.searchMatches.push({
                start: index,
                end: index + pattern.length - 1
            });
            
            startIndex = index + 1;
        }
        
        // Highlight first match
        if (this.searchMatches.length > 0) {
            this.currentMatchIndex = 0;
            this.scrollToBase(this.searchMatches[0].start);
        }
        
        this.render();
        return this.searchMatches.length;
    }
    
    /**
     * Go to next search match
     * @returns {Object|null} Current match info or null
     */
    nextMatch() {
        if (this.searchMatches.length === 0) return null;
        
        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
        const match = this.searchMatches[this.currentMatchIndex];
        this.scrollToBase(match.start);
        this.render();
        
        return {
            matchIndex: this.currentMatchIndex,
            totalMatches: this.searchMatches.length,
            ...match
        };
    }
    
    /**
     * Go to previous search match
     * @returns {Object|null} Current match info or null
     */
    previousMatch() {
        if (this.searchMatches.length === 0) return null;
        
        this.currentMatchIndex = this.currentMatchIndex <= 0 
            ? this.searchMatches.length - 1 
            : this.currentMatchIndex - 1;
        const match = this.searchMatches[this.currentMatchIndex];
        this.scrollToBase(match.start);
        this.render();
        
        return {
            matchIndex: this.currentMatchIndex,
            totalMatches: this.searchMatches.length,
            ...match
        };
    }
    
    /**
     * Clear search highlights
     */
    clearSearch() {
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        this.render();
    }
    
    /**
     * Get current search info
     * @returns {Object} Search state info
     */
    getSearchInfo() {
        return {
            matchCount: this.searchMatches.length,
            currentIndex: this.currentMatchIndex,
            currentMatch: this.currentMatchIndex >= 0 ? this.searchMatches[this.currentMatchIndex] : null
        };
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC METHODS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Set the view mode
     * @param {string} mode - 'processed', 'raw', or 'quality'
     */
    setViewMode(mode) {
        if (['processed', 'raw', 'quality'].includes(mode)) {
            this.viewMode = mode;
            this._calculateTraceMax();
            this.render();
        }
    }
    
    /**
     * Zoom in
     * @param {number} factor - Zoom factor (default 1.5)
     */
    zoomIn(factor = 1.5) {
        this.setZoom(this.xScale * factor);
    }
    
    /**
     * Zoom out
     * @param {number} factor - Zoom factor (default 1.5)
     */
    zoomOut(factor = 1.5) {
        this.setZoom(this.xScale / factor);
    }
    
    /**
     * Set zoom level directly
     * @param {number} scale - Pixels per data point
     */
    setZoom(scale) {
        // Clamp to min/max
        scale = Math.max(this.config.minXScale, Math.min(this.config.maxXScale, scale));
        
        if (scale !== this.xScale) {
            // Preserve scroll position (center of view)
            const centerX = this.scrollX + (this.container.clientWidth / 2);
            const centerDataX = centerX / this.xScale;
            
            this.xScale = scale;
            this._updateCanvasSize();
            
            // Restore center position
            const newCenterX = centerDataX * this.xScale;
            this.wrapper.scrollLeft = newCenterX - (this.container.clientWidth / 2);
            this.scrollX = this.wrapper.scrollLeft;
            
            this.render();
        }
    }
    
    /**
     * Fit the entire chromatogram in the view
     */
    fitToView() {
        if (!this.traces || !this.traces.G) return;
        
        const dataLength = this.traces.G.length;
        const containerWidth = this.container.clientWidth;
        
        this.setZoom(containerWidth / dataLength);
    }
    
    /**
     * Scroll to a specific base
     * @param {number} baseIndex - Base index to scroll to
     * @param {boolean} center - Whether to center the base (default true)
     */
    scrollToBase(baseIndex, center = true) {
        if (baseIndex < 0 || baseIndex >= this.peakLocations.length) return;
        
        const peakX = this.peakLocations[baseIndex];
        const x = peakX * this.xScale;
        
        if (center) {
            this.wrapper.scrollLeft = x - (this.container.clientWidth / 2);
        } else {
            this.wrapper.scrollLeft = x - 50; // Small margin from left
        }
        this.scrollX = this.wrapper.scrollLeft;
    }
    
    /**
     * Scroll to a specific data position
     * @param {number} dataX - Data x-coordinate
     */
    scrollToPosition(dataX) {
        const x = dataX * this.xScale;
        this.wrapper.scrollLeft = x - (this.container.clientWidth / 2);
        this.scrollX = this.wrapper.scrollLeft;
    }
    
    /**
     * Get current view information
     * @returns {Object} View information
     */
    getViewInfo() {
        const containerWidth = this.container.clientWidth;
        
        return {
            scrollX: this.scrollX,
            xScale: this.xScale,
            containerWidth: containerWidth,
            totalWidth: this.totalWidth,
            visibleStartX: this.scrollX / this.xScale,
            visibleEndX: (this.scrollX + containerWidth) / this.xScale,
            viewMode: this.viewMode
        };
    }
    
    /**
     * Get the currently visible base range
     * @returns {Object} Start and end base indices
     */
    getVisibleBaseRange() {
        const viewInfo = this.getViewInfo();
        
        let startBase = -1;
        let endBase = -1;
        
        for (let i = 0; i < this.peakLocations.length; i++) {
            const peakX = this.peakLocations[i];
            if (peakX >= viewInfo.visibleStartX && startBase === -1) {
                startBase = i;
            }
            if (peakX <= viewInfo.visibleEndX) {
                endBase = i;
            }
        }
        
        return { start: startBase, end: endBase };
    }
    
    /**
     * Set selection range
     * @param {number} start - Start base index
     * @param {number} end - End base index
     */
    setSelection(start, end) {
        // Normalize order
        this.selection = { 
            start: Math.min(start, end), 
            end: Math.max(start, end) 
        };
        this.render();
        
        if (this.onSelectionChange) {
            this.onSelectionChange(this.selection.start, this.selection.end, this.getSelectedSequence());
        }
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        this.selection = { start: -1, end: -1 };
        this.render();
        
        if (this.onSelectionChange) {
            this.onSelectionChange(-1, -1, '');
        }
    }
    
    /**
     * Get selected sequence
     * @returns {string} Selected sequence or empty string
     */
    getSelectedSequence() {
        if (this.selection.start < 0) return '';
        
        const start = Math.min(this.selection.start, this.selection.end);
        const end = Math.max(this.selection.start, this.selection.end);
        
        return this.sequence.substring(start, end + 1);
    }
    
    /**
     * Check if there is an active selection
     * @returns {boolean}
     */
    hasSelection() {
        return this.selection.start >= 0 && this.selection.end >= 0;
    }
    
    /**
     * Get selection info
     * @returns {Object} Selection details
     */
    getSelectionInfo() {
        if (!this.hasSelection()) {
            return { hasSelection: false };
        }
        
        const start = Math.min(this.selection.start, this.selection.end);
        const end = Math.max(this.selection.start, this.selection.end);
        
        return {
            hasSelection: true,
            start: start,
            end: end,
            length: end - start + 1,
            sequence: this.getSelectedSequence()
        };
    }
    
    /**
     * Mark a base as modified
     * @param {number} index - Base index
     */
    markModified(index) {
        if (index >= 0 && index < this.sequence.length) {
            this.modifications.add(index);
            this.render();
        }
    }
    
    /**
     * Unmark a base as modified (for undo operations)
     * @param {number} index - Base index
     */
    unmarkModified(index) {
        if (this.modifications.has(index)) {
            this.modifications.delete(index);
            this.render();
        }
    }
    
    /**
     * Clear all modification markers
     */
    clearModifications() {
        this.modifications.clear();
        this.render();
    }
    
    /**
     * Check if a base is modified
     * @param {number} index - Base index
     * @returns {boolean}
     */
    isModified(index) {
        return this.modifications.has(index);
    }
    
    /**
     * Apply destructive trim to the data
     * Removes bases and trace data outside the specified range
     * @param {number} trimStart - Start base index (0-based)
     * @param {number} trimEnd - End base index (0-based, inclusive)
     * @returns {Object} Info about what was trimmed
     */
    applyTrim(trimStart, trimEnd) {
        if (!this.sequence || trimStart < 0 || trimEnd >= this.sequence.length) {
            return { success: false, error: 'Invalid trim range' };
        }
        
        // Ensure start <= end
        if (trimStart > trimEnd) {
            [trimStart, trimEnd] = [trimEnd, trimStart];
        }
        
        const originalLength = this.sequence.length;
        const originalTraceLength = this.traces.G ? this.traces.G.length : 0;
        
        // Get trace bounds from peak locations
        const traceStart = this.peakLocations[trimStart];
        const traceEnd = this.peakLocations[trimEnd];
        
        // Trim sequence
        this.sequence = this.sequence.substring(trimStart, trimEnd + 1);
        
        // Trim quality scores
        if (this.qualityScores && this.qualityScores.length > 0) {
            this.qualityScores = this.qualityScores.slice(trimStart, trimEnd + 1);
        }
        
        // Trim traces (include some padding around the peaks)
        const tracePadding = 10; // Keep a few data points before/after
        const traceSliceStart = Math.max(0, traceStart - tracePadding);
        const traceSliceEnd = Math.min(originalTraceLength, traceEnd + tracePadding + 1);
        
        for (const nucleotide of this.channelOrder) {
            if (this.traces[nucleotide]) {
                this.traces[nucleotide] = this.traces[nucleotide].slice(traceSliceStart, traceSliceEnd);
            }
            if (this.rawTraces && this.rawTraces[nucleotide]) {
                this.rawTraces[nucleotide] = this.rawTraces[nucleotide].slice(traceSliceStart, traceSliceEnd);
            }
        }
        
        // Recompute peak locations (shift to new zero)
        this.peakLocations = this.peakLocations
            .slice(trimStart, trimEnd + 1)
            .map(pos => pos - traceSliceStart);
        
        // Clear selection, search, and modifications (indices no longer valid)
        this.selection = { start: -1, end: -1 };
        this.searchMatches = [];
        this.currentMatchIndex = -1;
        this.modifications.clear();
        
        // Recalculate trace max and update canvas
        this._calculateTraceMax();
        this._updateCanvasSize();
        
        // Reset scroll position
        this.scrollX = 0;
        this.wrapper.scrollLeft = 0;
        
        // Render
        this.render();
        
        return {
            success: true,
            originalLength: originalLength,
            trimmedLength: this.sequence.length,
            basesRemoved: originalLength - this.sequence.length,
            trimStart: trimStart,
            trimEnd: trimEnd
        };
    }
    
    /**
     * Get current data state (for syncing with app state)
     * @returns {Object} Current data
     */
    getData() {
        return {
            sequence: this.sequence,
            qualityScores: this.qualityScores,
            peakLocations: this.peakLocations,
            traces: this.traces,
            rawTraces: this.rawTraces,
            channelOrder: this.channelOrder
        };
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        this.canvas.remove();
        this.wrapper.remove();
        
        this.data = null;
        this.traces = null;
        this.ctx = null;
        this.modifications.clear();
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChromatogramCanvas, NUCLEOTIDE_COLORS, DEFAULT_CONFIG };
}

// For use in browser
if (typeof window !== 'undefined') {
    window.ChromatogramCanvas = ChromatogramCanvas;
    window.NUCLEOTIDE_COLORS = NUCLEOTIDE_COLORS;
}

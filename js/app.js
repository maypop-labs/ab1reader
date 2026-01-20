///////////////////////////////////////////////////////////////////////////////
// app.js
// Main renderer process script for AB1 Reader
///////////////////////////////////////////////////////////////////////////////

/**
 * AB1 Reader Application
 * Main application controller for the renderer process
 */
class AB1ReaderApp {
    
    constructor() {
        // State
        this.currentFile = null;
        this.fileData = null;
        this.chromatogram = null;
        this.minimap = null;
        this.rawTraces = null;
        
        // Editor
        this.baseEditor = null;
        this.editHistory = null;
        
        // Search state
        this.lastSearchQuery = '';
        
        // UI Elements
        this.elements = {};
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // INITIALIZATION
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Initialize the application
     */
    initialize() {
        console.log('AB1 Reader initializing...');
        
        // Check that required modules are loaded
        this._checkDependencies();
        
        // Cache UI elements
        this.cacheElements();
        
        // Set up event listeners
        this.bindEvents();
        
        // Set up IPC listeners
        this.setupIPC();
        
        // Initialize chromatogram canvas
        this.initializeChromatogram();
        
        // Initialize base editor
        this.initializeBaseEditor();
        
        // Initialize edit history
        this.initializeEditHistory();
        
        console.log('AB1 Reader initialized');
    }
    
    /**
     * Check that all required dependencies are loaded
     * @private
     */
    _checkDependencies() {
        const missing = [];
        
        if (typeof FastaExporter === 'undefined') {
            missing.push('FastaExporter');
        }
        if (typeof FastqExporter === 'undefined') {
            missing.push('FastqExporter');
        }
        if (typeof PngExporter === 'undefined') {
            missing.push('PngExporter');
        }
        
        if (missing.length > 0) {
            console.error('Missing dependencies:', missing.join(', '));
            console.error('Make sure all script tags are loaded in render.html');
        } else {
            console.log('All export modules loaded successfully');
        }
    }
    
    /**
     * Cache references to UI elements
     */
    cacheElements() {
        this.elements = {
            // Toolbar buttons
            btnOpen: document.getElementById('btn-open'),
            btnExportFasta: document.getElementById('btn-export-fasta'),
            btnExportFastq: document.getElementById('btn-export-fastq'),
            btnExportPng: document.getElementById('btn-export-png'),
            btnViewProcessed: document.getElementById('btn-view-processed'),
            btnViewQuality: document.getElementById('btn-view-quality'),
            btnViewRaw: document.getElementById('btn-view-raw'),
            btnZoomIn: document.getElementById('btn-zoom-in'),
            btnZoomOut: document.getElementById('btn-zoom-out'),
            btnZoomFit: document.getElementById('btn-zoom-fit'),
            btnGoto: document.getElementById('btn-goto'),
            btnCopy: document.getElementById('btn-copy'),
            
            // Search
            searchInput: document.getElementById('search-input'),
            btnSearchPrev: document.getElementById('btn-search-prev'),
            btnSearchNext: document.getElementById('btn-search-next'),
            searchResults: document.getElementById('search-results'),
            
            // Containers
            chromatogramContainer: document.getElementById('chromatogram-container'),
            minimapContainer: document.getElementById('minimap-container'),
            
            // Info displays
            sequenceDisplay: document.getElementById('sequence-display'),
            selectionDisplay: document.getElementById('selection-display'),
            metadataDisplay: document.getElementById('metadata-display'),
            
            // Statistics
            statLength: document.getElementById('stat-length'),
            statQuality: document.getElementById('stat-quality'),
            statGC: document.getElementById('stat-gc'),
            statHQ: document.getElementById('stat-hq'),
            
            // Status bar
            statusFile: document.getElementById('status-file'),
            statusPosition: document.getElementById('status-position'),
            statusSelection: document.getElementById('status-selection'),
            statusZoom: document.getElementById('status-zoom'),
            statusView: document.getElementById('status-view'),
            
            // Modal
            gotoModal: document.getElementById('goto-modal'),
            gotoInput: document.getElementById('goto-input'),
            gotoConfirm: document.getElementById('goto-confirm'),
            gotoCancel: document.getElementById('goto-cancel'),
            gotoClose: document.getElementById('goto-close'),
            
            // Quality Trim Modal
            qualityTrimModal: document.getElementById('quality-trim-modal'),
            qualityTrimThreshold: document.getElementById('quality-trim-threshold'),
            qualityTrimThresholdValue: document.getElementById('quality-trim-threshold-value'),
            qualityTrimLower: document.getElementById('quality-trim-lower'),
            qualityTrimLowerValue: document.getElementById('quality-trim-lower-value'),
            qualityTrimPreview: document.getElementById('quality-trim-preview'),
            qualityTrimInfo: document.getElementById('quality-trim-info'),
            qualityTrimCancel: document.getElementById('quality-trim-cancel'),
            qualityTrimPreviewBtn: document.getElementById('quality-trim-preview-btn'),
            qualityTrimApply: document.getElementById('quality-trim-apply'),
            qualityTrimClose: document.getElementById('quality-trim-close'),
            
            // Tooltip
            tooltip: document.getElementById('tooltip')
        };
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Toolbar buttons
        this.elements.btnOpen.addEventListener('click', () => this.openFile());
        this.elements.btnExportFasta.addEventListener('click', () => this.exportFasta());
        this.elements.btnExportFastq.addEventListener('click', () => this.exportFastq());
        this.elements.btnExportPng.addEventListener('click', () => this.exportPng());
        
        // View mode buttons
        this.elements.btnViewProcessed.addEventListener('click', () => this.setViewMode('processed'));
        this.elements.btnViewQuality.addEventListener('click', () => this.setViewMode('quality'));
        this.elements.btnViewRaw.addEventListener('click', () => this.setViewMode('raw'));
        
        // Zoom buttons
        this.elements.btnZoomIn.addEventListener('click', () => this.zoomIn());
        this.elements.btnZoomOut.addEventListener('click', () => this.zoomOut());
        this.elements.btnZoomFit.addEventListener('click', () => this.zoomFit());
        
        // Go to button
        this.elements.btnGoto.addEventListener('click', () => this.showGotoDialog());
        
        // Copy button
        this.elements.btnCopy.addEventListener('click', () => this.copySequence());
        
        // Search
        this.elements.searchInput.addEventListener('input', (e) => this.onSearchInput(e));
        this.elements.searchInput.addEventListener('keydown', (e) => this.onSearchKeydown(e));
        this.elements.btnSearchPrev.addEventListener('click', () => this.searchPrevious());
        this.elements.btnSearchNext.addEventListener('click', () => this.searchNext());
        
        // Modal events
        this.elements.gotoConfirm.addEventListener('click', () => this.confirmGoto());
        this.elements.gotoCancel.addEventListener('click', () => this.hideGotoDialog());
        this.elements.gotoClose.addEventListener('click', () => this.hideGotoDialog());
        this.elements.gotoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmGoto();
            if (e.key === 'Escape') this.hideGotoDialog();
        });
        this.elements.gotoModal.querySelector('.modal-backdrop').addEventListener('click', () => this.hideGotoDialog());
        
        // Quality trim modal events
        this.elements.qualityTrimClose.addEventListener('click', () => this.hideQualityTrimDialog());
        this.elements.qualityTrimCancel.addEventListener('click', () => this.hideQualityTrimDialog());
        this.elements.qualityTrimApply.addEventListener('click', () => this.applyQualityTrim());
        this.elements.qualityTrimPreviewBtn.addEventListener('click', () => this.previewQualityTrim());
        this.elements.qualityTrimModal.querySelector('.modal-backdrop').addEventListener('click', () => this.hideQualityTrimDialog());
        
        // Quality trim slider events
        this.elements.qualityTrimThreshold.addEventListener('input', (e) => {
            this.elements.qualityTrimThresholdValue.textContent = e.target.value;
            this.previewQualityTrim();
        });
        this.elements.qualityTrimLower.addEventListener('input', (e) => {
            this.elements.qualityTrimLowerValue.textContent = e.target.value;
            this.previewQualityTrim();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    /**
     * Set up IPC communication with main process
     */
    setupIPC() {
        // Listen for messages from main process
        window.api.receive('toRender', (data) => this.handleMainMessage(data));
        window.api.receive('fromMain', (data) => this.handleMainResponse(data));
    }
    
    /**
     * Initialize the chromatogram canvas
     */
    initializeChromatogram() {
        // Will be created when file is loaded
        this.chromatogram = null;
        this.minimap = null;
    }
    
    /**
     * Initialize the base editor
     */
    initializeBaseEditor() {
        // Create base editor instance (container will be the chromatogram container)
        const container = document.body; // Use body for absolute positioning
        this.baseEditor = new BaseEditor(container, {
            onBaseChange: (index, oldBase, newBase) => this.onBaseChange(index, oldBase, newBase),
            onClose: () => {
                // Editor closed - could update UI if needed
            }
        });
    }
    
    /**
     * Initialize the edit history system
     */
    initializeEditHistory() {
        this.editHistory = new EditHistory(100);
        
        // Listen for history changes to update UI
        this.editHistory.onChange = () => this.updateEditHistoryUI();
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // IPC HANDLERS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Handle messages from main process (menu commands, etc.)
     */
    handleMainMessage(data) {
        if (!data || !data.command) return;
        
        switch (data.command) {
            case 'initialize':
                console.log('Received initialize command');
                break;
                
            case 'menu_open_ab1_file':
                this.openFile();
                break;
                
            case 'menu_export_fasta':
                this.exportFasta();
                break;
                
            case 'menu_export_fastq':
                this.exportFastq();
                break;
                
            case 'menu_export_png':
                this.exportPng();
                break;
                
            case 'menu_view_mode':
                this.setViewMode(data.mode);
                break;
                
            case 'menu_zoom_in':
                this.zoomIn();
                break;
                
            case 'menu_zoom_out':
                this.zoomOut();
                break;
                
            case 'menu_zoom_fit':
                this.zoomFit();
                break;
                
            case 'menu_copy_sequence':
                this.copySequence();
                break;
                
            case 'menu_undo':
                this.undo();
                break;
                
            case 'menu_redo':
                this.redo();
                break;
                
            case 'menu_quality_trim':
                this.showQualityTrimDialog();
                break;
                
            case 'debug_show_tags':
                this.showAllTags();
                break;
                
            case 'window_resized':
                if (this.chromatogram) {
                    this.chromatogram.render();
                }
                if (this.minimap) {
                    this.minimap.render();
                }
                break;
        }
    }
    
    /**
     * Handle responses from main process IPC calls
     */
    handleMainResponse(data) {
        if (!data || !data.command) return;
        
        switch (data.command) {
            case 'abif_open_dialog':
                if (data.success && data.filePath) {
                    this.loadFile(data.filePath);
                }
                break;
                
            case 'abif_parse_file':
                if (data.success) {
                    this.onFileLoaded(data);
                } else {
                    this.showError('Failed to parse file', data.error);
                }
                break;
                
            case 'abif_get_raw_traces':
                if (data.success) {
                    this.rawTraces = data.rawTraces;
                    if (this.chromatogram) {
                        this.chromatogram.loadRawTraces(data.rawTraces);
                    }
                }
                break;
                
            case 'show_save_dialog':
                if (data.success && data.filePath) {
                    console.log(`File saved successfully: ${data.filePath}`);
                    // Could show a success notification here
                } else if (data.canceled) {
                    console.log('Save dialog canceled');
                } else {
                    console.error('Save failed:', data.error);
                    alert(`Failed to save file: ${data.error || 'Unknown error'}`);
                }
                break;
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // FILE OPERATIONS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Open file dialog
     */
    openFile() {
        window.api.send('toMain', { command: 'abif_open_dialog' });
    }
    
    /**
     * Load a file by path
     */
    loadFile(filePath) {
        console.log('Loading file:', filePath);
        this.currentFile = filePath;
        
        // Show loading state
        this.elements.chromatogramContainer.classList.add('loading');
        
        // Request file parsing
        window.api.send('toMain', { 
            command: 'abif_parse_file',
            filePath: filePath
        });
    }
    
    /**
     * Handle successful file load
     */
    onFileLoaded(data) {
        console.log('File loaded:', data.fileName);
        
        this.fileData = data;
        this.currentFile = data.filePath;
        
        // Remove empty state
        this.elements.chromatogramContainer.classList.remove('empty');
        this.elements.chromatogramContainer.classList.remove('loading');
        this.elements.chromatogramContainer.innerHTML = '';
        
        // Create chromatogram canvas
        this.chromatogram = new ChromatogramCanvas(this.elements.chromatogramContainer, {
            height: this.elements.chromatogramContainer.clientHeight
        });
        
        // Set up chromatogram callbacks
        this.chromatogram.onBaseHover = (index, info) => this.onBaseHover(index, info);
        this.chromatogram.onBaseClick = (index, info) => this.onBaseClick(index, info);
        this.chromatogram.onScroll = (scrollX, viewInfo) => this.onChromatogramScroll(scrollX, viewInfo);
        this.chromatogram.onSelectionChange = (start, end, seq) => this.onSelectionChange(start, end, seq);
        
        // Load data into chromatogram
        this.chromatogram.loadData({
            traces: data.traces,
            sequence: data.sequence,
            peakLocations: data.peakLocations,
            qualityScores: data.qualityScores,
            channelOrder: data.channelOrder
        });
        
        // Create minimap
        this.elements.minimapContainer.style.display = 'block';
        this.minimap = new Minimap(this.elements.minimapContainer);
        this.minimap.loadData(data.traces, data.peakLocations);
        this.minimap.onNavigate = (dataX) => this.onMinimapNavigate(dataX);
        
        // Request raw traces for raw view mode
        window.api.send('toMain', {
            command: 'abif_get_raw_traces',
            filePath: data.filePath
        });
        
        // Clear edit history for new file
        if (this.editHistory) {
            this.editHistory.clear();
            this.updateEditHistoryUI();
        }
        
        // Update UI
        this.updateSequenceDisplay(data.sequence);
        this.updateSelectionDisplay(null);
        this.updateMetadataDisplay(data.metadata);
        this.updateStatistics(data);
        this.updateStatusBar(data);
        this.enableControls(true);
        
        // Set initial zoom to fit
        setTimeout(() => {
            this.chromatogram.fitToView();
            this.updateZoomStatus();
            this.syncMinimap();
        }, 100);
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // UI UPDATES
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Update the sequence display panel
     */
    updateSequenceDisplay(sequence) {
        if (!sequence) {
            this.elements.sequenceDisplay.innerHTML = '<span class="placeholder">No sequence</span>';
            return;
        }
        
        // Color-code the bases
        let html = '';
        for (let i = 0; i < sequence.length; i++) {
            const base = sequence[i];
            html += `<span class="base-${base}">${base}</span>`;
            
            // Add space every 10 bases for readability
            if ((i + 1) % 10 === 0) {
                html += ' ';
            }
            // Add line break every 60 bases
            if ((i + 1) % 60 === 0) {
                html += '<br>';
            }
        }
        
        this.elements.sequenceDisplay.innerHTML = html;
    }
    
    /**
     * Update the selection display panel
     */
    updateSelectionDisplay(selectionInfo) {
        if (!selectionInfo || !selectionInfo.hasSelection) {
            this.elements.selectionDisplay.innerHTML = '<span class="placeholder">Click and drag on the chromatogram to select bases</span>';
            this.elements.statusSelection.style.display = 'none';
            return;
        }
        
        const { start, end, length, sequence } = selectionInfo;
        
        // Truncate very long sequences
        let displaySeq = sequence;
        if (sequence.length > 100) {
            displaySeq = sequence.substring(0, 50) + '...' + sequence.substring(sequence.length - 50);
        }
        
        this.elements.selectionDisplay.innerHTML = `
            <div class="selection-info">
                <strong>Position:</strong> ${start + 1} - ${end + 1} (${length} bp)
            </div>
            <div class="selection-sequence">${displaySeq}</div>
        `;
        
        // Update status bar
        this.elements.statusSelection.style.display = 'flex';
        this.elements.statusSelection.querySelector('span').textContent = `Selection: ${start + 1}-${end + 1} (${length} bp)`;
    }
    
    /**
     * Update the metadata display panel
     */
    updateMetadataDisplay(metadata) {
        if (!metadata) {
            this.elements.metadataDisplay.innerHTML = '<span class="placeholder">No metadata</span>';
            return;
        }
        
        const fields = [
            { label: 'Sample', value: metadata.sampleName },
            { label: 'Machine', value: metadata.machineName || metadata.machineModel },
            { label: 'Well', value: metadata.well },
            { label: 'Run', value: metadata.runName },
            { label: 'Date', value: this.formatDate(metadata.runStartDate) },
            { label: 'Dye Set', value: metadata.dyeSet }
        ];
        
        let html = '';
        for (const field of fields) {
            if (field.value) {
                html += `<span class="metadata-label">${field.label}:</span>`;
                html += `<span class="metadata-value">${field.value}</span>`;
            }
        }
        
        this.elements.metadataDisplay.innerHTML = html || '<span class="placeholder">No metadata</span>';
    }
    
    /**
     * Update statistics display
     */
    updateStatistics(data) {
        // Sequence length
        this.elements.statLength.textContent = data.sequenceLength || '--';
        
        // Average quality
        if (data.qualityScores && data.qualityScores.length > 0) {
            const avgQuality = data.qualityScores.reduce((a, b) => a + b, 0) / data.qualityScores.length;
            this.elements.statQuality.textContent = avgQuality.toFixed(1);
            
            // High quality bases (>= 20)
            const hqCount = data.qualityScores.filter(q => q >= 20).length;
            const hqPercent = (hqCount / data.qualityScores.length * 100).toFixed(1);
            this.elements.statHQ.textContent = `${hqPercent}%`;
        } else {
            this.elements.statQuality.textContent = '--';
            this.elements.statHQ.textContent = '--';
        }
        
        // GC content
        if (data.sequence) {
            const gcCount = (data.sequence.match(/[GC]/gi) || []).length;
            const gcPercent = (gcCount / data.sequence.length * 100).toFixed(1);
            this.elements.statGC.textContent = `${gcPercent}%`;
        } else {
            this.elements.statGC.textContent = '--';
        }
    }
    
    /**
     * Update status bar
     */
    updateStatusBar(data) {
        // File name
        const fileName = data ? data.fileName : 'No file loaded';
        this.elements.statusFile.querySelector('span').textContent = fileName;
        
        // View mode
        this.updateViewModeStatus();
        
        // Zoom
        this.updateZoomStatus();
    }
    
    /**
     * Update position in status bar
     */
    updatePositionStatus(position, total) {
        if (position !== null && total) {
            this.elements.statusPosition.querySelector('span').textContent = 
                `Position: ${position} / ${total}`;
        } else {
            this.elements.statusPosition.querySelector('span').textContent = 'Position: --';
        }
    }
    
    /**
     * Update zoom level in status bar
     */
    updateZoomStatus() {
        if (this.chromatogram) {
            const viewInfo = this.chromatogram.getViewInfo();
            const zoomPercent = Math.round(viewInfo.xScale * 50); // Normalize to percentage
            this.elements.statusZoom.querySelector('span').textContent = `Zoom: ${zoomPercent}%`;
        }
    }
    
    /**
     * Update view mode in status bar
     */
    updateViewModeStatus() {
        const modeNames = {
            'processed': 'Processed',
            'quality': 'Quality',
            'raw': 'Raw'
        };
        const mode = this.chromatogram ? this.chromatogram.viewMode : 'processed';
        this.elements.statusView.querySelector('span').textContent = modeNames[mode] || mode;
    }
    
    /**
     * Sync minimap with chromatogram viewport
     */
    syncMinimap() {
        if (!this.minimap || !this.chromatogram) return;
        
        const viewInfo = this.chromatogram.getViewInfo();
        this.minimap.updateViewport(viewInfo.visibleStartX, viewInfo.visibleEndX);
        
        // Update selection
        if (this.chromatogram.hasSelection()) {
            const sel = this.chromatogram.getSelectionInfo();
            this.minimap.updateSelection(sel.start, sel.end);
        } else {
            this.minimap.updateSelection(-1, -1);
        }
        
        // Update search matches
        this.minimap.updateSearchMatches(this.chromatogram.searchMatches);
    }
    
    /**
     * Enable or disable controls based on file load state
     */
    enableControls(enabled) {
        this.elements.btnExportFasta.disabled = !enabled;
        this.elements.btnExportFastq.disabled = !enabled;
        this.elements.btnExportPng.disabled = !enabled;
        this.elements.btnZoomIn.disabled = !enabled;
        this.elements.btnZoomOut.disabled = !enabled;
        this.elements.btnZoomFit.disabled = !enabled;
        this.elements.btnGoto.disabled = !enabled;
        this.elements.btnCopy.disabled = !enabled;
        this.elements.searchInput.disabled = !enabled;
        this.elements.btnSearchPrev.disabled = !enabled;
        this.elements.btnSearchNext.disabled = !enabled;
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // VIEW CONTROLS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Set view mode (processed, quality, raw)
     */
    setViewMode(mode) {
        if (!this.chromatogram) return;
        
        // Update button states
        this.elements.btnViewProcessed.classList.toggle('active', mode === 'processed');
        this.elements.btnViewQuality.classList.toggle('active', mode === 'quality');
        this.elements.btnViewRaw.classList.toggle('active', mode === 'raw');
        
        // Update chromatogram
        this.chromatogram.setViewMode(mode);
        
        // Update status bar
        this.updateViewModeStatus();
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        if (this.chromatogram) {
            this.chromatogram.zoomIn();
            this.updateZoomStatus();
            this.syncMinimap();
        }
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        if (this.chromatogram) {
            this.chromatogram.zoomOut();
            this.updateZoomStatus();
            this.syncMinimap();
        }
    }
    
    /**
     * Fit to window
     */
    zoomFit() {
        if (this.chromatogram) {
            this.chromatogram.fitToView();
            this.updateZoomStatus();
            this.syncMinimap();
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // GO TO POSITION
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Show go-to-position dialog
     */
    showGotoDialog() {
        if (!this.fileData) return;
        
        this.elements.gotoInput.max = this.fileData.sequenceLength;
        this.elements.gotoInput.value = '';
        this.elements.gotoModal.style.display = 'flex';
        this.elements.gotoInput.focus();
    }
    
    /**
     * Hide go-to-position dialog
     */
    hideGotoDialog() {
        this.elements.gotoModal.style.display = 'none';
    }
    
    /**
     * Confirm go-to-position
     */
    confirmGoto() {
        const position = parseInt(this.elements.gotoInput.value, 10);
        
        if (isNaN(position) || position < 1 || position > this.fileData.sequenceLength) {
            this.elements.gotoInput.classList.add('error');
            setTimeout(() => this.elements.gotoInput.classList.remove('error'), 500);
            return;
        }
        
        // Go to position (convert 1-based to 0-based index)
        this.chromatogram.scrollToBase(position - 1);
        this.syncMinimap();
        this.hideGotoDialog();
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // SEARCH
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Handle search input
     */
    onSearchInput(e) {
        const query = e.target.value.trim();
        
        if (query === this.lastSearchQuery) return;
        this.lastSearchQuery = query;
        
        if (!query) {
            this.clearSearch();
            return;
        }
        
        this.performSearch(query);
    }
    
    /**
     * Handle search input keydown
     */
    onSearchKeydown(e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                this.searchPrevious();
            } else {
                this.searchNext();
            }
        } else if (e.key === 'Escape') {
            this.clearSearch();
            this.elements.searchInput.value = '';
            this.elements.searchInput.blur();
        }
    }
    
    /**
     * Perform search
     */
    performSearch(query) {
        if (!this.chromatogram) return;
        
        const count = this.chromatogram.search(query);
        this.updateSearchResults(count);
        this.syncMinimap();
    }
    
    /**
     * Go to next search match
     */
    searchNext() {
        if (!this.chromatogram) return;
        
        const result = this.chromatogram.nextMatch();
        if (result) {
            this.updateSearchResults(result.totalMatches, result.matchIndex);
            this.syncMinimap();
        }
    }
    
    /**
     * Go to previous search match
     */
    searchPrevious() {
        if (!this.chromatogram) return;
        
        const result = this.chromatogram.previousMatch();
        if (result) {
            this.updateSearchResults(result.totalMatches, result.matchIndex);
            this.syncMinimap();
        }
    }
    
    /**
     * Clear search
     */
    clearSearch() {
        if (this.chromatogram) {
            this.chromatogram.clearSearch();
            this.syncMinimap();
        }
        this.lastSearchQuery = '';
        this.elements.searchResults.textContent = '';
    }
    
    /**
     * Update search results display
     */
    updateSearchResults(count, currentIndex = 0) {
        if (count === 0) {
            this.elements.searchResults.textContent = 'No matches';
            this.elements.searchResults.style.color = '#cc0000';
        } else {
            this.elements.searchResults.textContent = `${currentIndex + 1} of ${count}`;
            this.elements.searchResults.style.color = '';
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // CHROMATOGRAM CALLBACKS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Handle base hover
     */
    onBaseHover(index, info) {
        if (index >= 0 && info) {
            this.updatePositionStatus(info.position, this.fileData.sequenceLength);
            this.showTooltip(info);
        } else {
            this.updatePositionStatus(null);
            this.hideTooltip();
        }
    }
    
    /**
     * Handle base click
     */
    onBaseClick(index, info) {
        if (index >= 0 && info) {
            console.log('Base clicked:', index, info);
            
            // Show the base editor popover
            if (this.baseEditor) {
                // Use click coordinates if available, otherwise calculate from peak location
                let x, y;
                
                if (info.clickX !== undefined && info.clickY !== undefined) {
                    x = info.clickX;
                    y = info.clickY;
                } else {
                    // Fallback: calculate position from peak location
                    const canvasRect = this.chromatogram.canvas.getBoundingClientRect();
                    const peakX = info.peakLocation * this.chromatogram.xScale;
                    const scrollLeft = this.chromatogram.wrapper.scrollLeft;
                    x = canvasRect.left + (peakX - scrollLeft);
                    y = canvasRect.top + this.chromatogram.config.traceAreaHeight + 20;
                }
                
                this.baseEditor.show(index, info.base, x, y);
            }
        }
    }
    
    /**
     * Handle base change from editor
     * Executes through EditHistory command pattern
     */
    onBaseChange(index, oldBase, newBase) {
        console.log(`Base change: Position ${index + 1}, ${oldBase} -> ${newBase}`);
        
        if (!this.chromatogram || !this.fileData || !this.editHistory) {
            return;
        }
        
        // Create command and execute through history
        const command = new ChangeBaseCommand(
            this.chromatogram,
            this.fileData,
            index,
            oldBase,
            newBase,
            (updatedIndex, updatedBase) => {
                // Callback after base change - update UI
                this.updateSequenceDisplay(this.fileData.sequence);
                this.updateStatistics(this.fileData);
                
                // TODO: Mark base as modified (Phase 4.3)
            }
        );
        
        // Execute through history (this will trigger undo/redo stack updates)
        this.editHistory.execute(command);
    }
    
    /**
     * Handle chromatogram scroll
     */
    onChromatogramScroll(scrollX, viewInfo) {
        // Sync minimap
        this.syncMinimap();
        
        // Update visible base range in status
        const range = this.chromatogram.getVisibleBaseRange();
        if (range.start >= 0) {
            this.updatePositionStatus(`${range.start + 1}-${range.end + 1}`, this.fileData.sequenceLength);
        }
    }
    
    /**
     * Handle selection change
     */
    onSelectionChange(start, end, sequence) {
        if (start >= 0 && end >= 0) {
            this.updateSelectionDisplay({
                hasSelection: true,
                start: start,
                end: end,
                length: end - start + 1,
                sequence: sequence
            });
        } else {
            this.updateSelectionDisplay(null);
        }
        
        // Sync minimap
        this.syncMinimap();
    }
    
    /**
     * Handle minimap navigation
     */
    onMinimapNavigate(dataX) {
        if (this.chromatogram) {
            this.chromatogram.scrollToPosition(dataX);
            this.syncMinimap();
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // TOOLTIP
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Show tooltip with base information
     */
    showTooltip(info) {
        const tooltip = this.elements.tooltip;
        
        tooltip.innerHTML = `
            <strong>Position ${info.position}</strong><br>
            Base: <span style="color: ${NUCLEOTIDE_COLORS[info.base]}">${info.base}</span><br>
            Quality: ${info.quality}
        `;
        
        tooltip.style.display = 'block';
        
        // Position near cursor - this would need mouse position tracking
        // For now, just show in corner
        tooltip.style.top = '60px';
        tooltip.style.right = '20px';
        tooltip.style.left = 'auto';
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        this.elements.tooltip.style.display = 'none';
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // CLIPBOARD
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Copy sequence to clipboard
     */
    copySequence() {
        if (!this.fileData || !this.fileData.sequence) return;
        
        let textToCopy = this.fileData.sequence;
        
        // If there's a selection, copy only selected portion
        if (this.chromatogram && this.chromatogram.hasSelection()) {
            textToCopy = this.chromatogram.getSelectedSequence();
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            console.log('Sequence copied to clipboard');
            // Could show a toast notification here
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // EXPORT
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Export as FASTA
     */
    exportFasta() {
        if (!this.fileData || !this.fileData.sequence) {
            alert('No sequence data available for export.');
            return;
        }
        
        // Get selection range if any
        let options = {};
        if (this.chromatogram && this.chromatogram.hasSelection()) {
            const sel = this.chromatogram.getSelectionInfo();
            options.start = sel.start;
            options.end = sel.end;
        }
        
        // Generate FASTA content
        let fastaContent;
        try {
            fastaContent = FastaExporter.generateFromFileData(this.fileData, options);
        } catch (error) {
            console.error('Error generating FASTA:', error);
            alert(`Error generating FASTA: ${error.message}`);
            return;
        }
        
        // Determine default filename
        let defaultFileName = 'sequence.fasta';
        if (this.fileData.fileName) {
            const baseName = this.fileData.fileName.replace(/\.[^/.]+$/, '');
            defaultFileName = `${baseName}.fasta`;
        }
        
        // Show save dialog
        window.api.send('toMain', {
            command: 'show_save_dialog',
            title: 'Export as FASTA',
            defaultPath: defaultFileName,
            filters: [
                { name: 'FASTA Files', extensions: ['fasta', 'fa', 'fas'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            content: fastaContent
        });
    }
    
    /**
     * Export as FASTQ (includes quality scores)
     */
    exportFastq() {
        if (!this.fileData || !this.fileData.sequence) {
            alert('No sequence data available for export.');
            return;
        }
        
        if (!this.fileData.qualityScores || this.fileData.qualityScores.length === 0) {
            alert('No quality scores available. Use FASTA export for sequence only.');
            return;
        }
        
        // Get selection range if any
        let options = {};
        if (this.chromatogram && this.chromatogram.hasSelection()) {
            const sel = this.chromatogram.getSelectionInfo();
            options.start = sel.start;
            options.end = sel.end;
        }
        
        // Generate FASTQ content
        let fastqContent;
        try {
            fastqContent = FastqExporter.generateFromFileData(this.fileData, options);
        } catch (error) {
            console.error('Error generating FASTQ:', error);
            alert(`Error generating FASTQ: ${error.message}`);
            return;
        }
        
        // Determine default filename
        let defaultFileName = 'sequence.fastq';
        if (this.fileData.fileName) {
            const baseName = this.fileData.fileName.replace(/\.[^/.]+$/, '');
            defaultFileName = `${baseName}.fastq`;
        }
        
        // Show save dialog
        window.api.send('toMain', {
            command: 'show_save_dialog',
            title: 'Export as FASTQ',
            defaultPath: defaultFileName,
            filters: [
                { name: 'FASTQ Files', extensions: ['fastq', 'fq'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            content: fastqContent
        });
    }
    
    /**
     * Export as PNG image
     */
    async exportPng() {
        // Check if PngExporter is available
        if (typeof PngExporter === 'undefined' || !PngExporter) {
            console.error('PngExporter is not defined. Check that js/export/PngExporter.js is loaded.');
            alert('PNG export is not available. The PngExporter module failed to load.\n\nPlease check the browser console (F12) for details.');
            return;
        }
        
        if (!this.fileData || !this.fileData.sequence) {
            alert('No sequence data available for export.');
            return;
        }
        
        if (!this.fileData.traces) {
            alert('No trace data available for export.');
            return;
        }
        
        // Determine view mode from chromatogram if available
        const viewMode = this.chromatogram ? this.chromatogram.viewMode : 'processed';
        
        // Prepare file data with rawTraces if available
        const exportData = {
            ...this.fileData,
            rawTraces: this.rawTraces || null
        };
        
        // Check if raw mode is requested but raw traces not available
        if (viewMode === 'raw' && !this.rawTraces) {
            alert('Raw traces not available. Switching to processed view.');
            exportData.viewMode = 'processed';
        }
        
        // Calculate approximate canvas size to warn about very large exports
        const sequenceLength = this.fileData.sequence.length;
        const pixelsPerBase = 12;
        const estimatedWidth = Math.max(800, sequenceLength * pixelsPerBase);
        const maxWidth = 50000; // Limit to prevent memory issues
        
        if (estimatedWidth > maxWidth) {
            const proceed = confirm(
                `This export will create a very large image (${Math.round(estimatedWidth)}px wide). ` +
                `This may take a long time or run out of memory. Continue?`
            );
            if (!proceed) {
                return;
            }
        }
        
        // Export options
        const options = {
            viewMode: viewMode,
            pixelsPerBase: pixelsPerBase,
            height: 450
        };
        
        // Generate PNG blob with better error handling
        let pngBlob;
        try {
            if (typeof PngExporter.exportFromFileData !== 'function') {
                throw new Error('PngExporter.exportFromFileData is not a function');
            }
            pngBlob = await PngExporter.exportFromFileData(exportData, options);
        } catch (error) {
            console.error('Error generating PNG:', error);
            alert(`Error generating PNG: ${error.message}\n\nPlease check the console for details.`);
            return;
        }
        
        if (!pngBlob) {
            alert('Failed to generate PNG: No blob was created.');
            return;
        }
        
        // Convert blob to base64 for IPC using Promise for better error handling
        try {
            const base64Data = await this._blobToBase64(pngBlob);
            
            if (!base64Data) {
                alert('Failed to convert PNG to base64 format.');
                return;
            }
            
            // Determine default filename
            let defaultFileName = 'chromatogram.png';
            if (this.fileData.fileName) {
                const baseName = this.fileData.fileName.replace(/\.[^/.]+$/, '');
                defaultFileName = `${baseName}.png`;
            }
            
            // Show save dialog with binary data indicator
            window.api.send('toMain', {
                command: 'show_save_dialog',
                title: 'Export as PNG',
                defaultPath: defaultFileName,
                filters: [
                    { name: 'PNG Images', extensions: ['png'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                content: base64Data,
                isBinary: true,
                encoding: 'base64'
            });
        } catch (error) {
            console.error('Error converting PNG to base64:', error);
            alert(`Failed to process PNG data: ${error.message}`);
        }
    }
    
    /**
     * Convert blob to base64 string
     * @private
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onloadend = () => {
                try {
                    const result = reader.result;
                    if (!result) {
                        reject(new Error('FileReader returned empty result'));
                        return;
                    }
                    // Remove data:image/png;base64, prefix
                    const base64Data = result.split(',')[1];
                    if (!base64Data) {
                        reject(new Error('Failed to extract base64 data from data URL'));
                        return;
                    }
                    resolve(base64Data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('FileReader error: ' + (reader.error?.message || 'Unknown error')));
            };
            
            reader.onabort = () => {
                reject(new Error('FileReader operation was aborted'));
            };
            
            try {
                reader.readAsDataURL(blob);
            } catch (error) {
                reject(new Error('Failed to read blob: ' + error.message));
            }
        });
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // EDIT OPERATIONS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Undo the last edit operation
     */
    undo() {
        if (!this.editHistory) return;
        
        if (this.editHistory.undo()) {
            console.log('Undo performed');
            // UI updates happen via command's onUpdate callback
            this.updateSequenceDisplay(this.fileData.sequence);
            this.updateStatistics(this.fileData);
        }
    }
    
    /**
     * Redo the last undone operation
     */
    redo() {
        if (!this.editHistory) return;
        
        if (this.editHistory.redo()) {
            console.log('Redo performed');
            // UI updates happen via command's onUpdate callback
            this.updateSequenceDisplay(this.fileData.sequence);
            this.updateStatistics(this.fileData);
        }
    }
    
    /**
     * Show quality trim dialog
     */
    showQualityTrimDialog() {
        if (!this.fileData || !this.fileData.qualityScores) {
            alert('No quality scores available for trimming.');
            return;
        }
        
        // Reset to defaults
        this.elements.qualityTrimThreshold.value = 24;
        this.elements.qualityTrimThresholdValue.textContent = '24';
        this.elements.qualityTrimLower.value = 15;
        this.elements.qualityTrimLowerValue.textContent = '15';
        
        // Show modal
        this.elements.qualityTrimModal.style.display = 'flex';
        
        // Calculate initial preview
        this.previewQualityTrim();
    }
    
    /**
     * Hide quality trim dialog
     */
    hideQualityTrimDialog() {
        this.elements.qualityTrimModal.style.display = 'none';
    }
    
    /**
     * Preview quality trim points
     */
    previewQualityTrim() {
        if (!this.fileData || !this.fileData.qualityScores) return;
        
        const upperThreshold = parseInt(this.elements.qualityTrimThreshold.value, 10);
        const lowerThreshold = parseInt(this.elements.qualityTrimLower.value, 10);
        
        const trimPoints = QualityTrimmer.findTrimPoints(
            this.fileData.qualityScores,
            upperThreshold,
            lowerThreshold
        );
        
        const stats = QualityTrimmer.calculateStatistics(
            this.fileData.qualityScores,
            trimPoints.trimStart,
            trimPoints.trimEnd
        );
        
        const originalLength = this.fileData.qualityScores.length;
        const trimmedLength = trimPoints.trimEnd - trimPoints.trimStart + 1;
        const trimmedPercent = ((trimmedLength / originalLength) * 100).toFixed(1);
        
        this.elements.qualityTrimInfo.innerHTML = `
            <div><strong>Trim Start:</strong> Position ${trimPoints.trimStart + 1} (1-based)</div>
            <div><strong>Trim End:</strong> Position ${trimPoints.trimEnd + 1} (1-based)</div>
            <div><strong>Original Length:</strong> ${originalLength} bases</div>
            <div><strong>Trimmed Length:</strong> ${trimmedLength} bases (${trimmedPercent}%)</div>
            <div style="margin-top: 8px;"><strong>Quality Stats (trimmed region):</strong></div>
            <div style="font-size: 11px; margin-left: 8px;">
                Mean: ${stats.mean.toFixed(1)}, Median: ${stats.median.toFixed(1)}, 
                Range: ${stats.min}-${stats.max}
            </div>
        `;
    }
    
    /**
     * Apply quality trim (DESTRUCTIVE)
     * Permanently removes bases and trace data outside the trim region.
     * Reload the file to restore original data.
     */
    applyQualityTrim() {
        if (!this.fileData || !this.fileData.qualityScores) return;
        
        const upperThreshold = parseInt(this.elements.qualityTrimThreshold.value, 10);
        const lowerThreshold = parseInt(this.elements.qualityTrimLower.value, 10);
        
        const trimPoints = QualityTrimmer.findTrimPoints(
            this.fileData.qualityScores,
            upperThreshold,
            lowerThreshold
        );
        
        // Apply destructive trim to chromatogram
        if (this.chromatogram) {
            const result = this.chromatogram.applyTrim(trimPoints.trimStart, trimPoints.trimEnd);
            
            if (!result.success) {
                alert(`Trim failed: ${result.error}`);
                return;
            }
            
            // Sync fileData with trimmed chromatogram data
            const trimmedData = this.chromatogram.getData();
            this.fileData.sequence = trimmedData.sequence;
            this.fileData.qualityScores = trimmedData.qualityScores;
            this.fileData.peakLocations = trimmedData.peakLocations;
            this.fileData.traces = trimmedData.traces;
            this.fileData.sequenceLength = trimmedData.sequence.length;
            if (trimmedData.rawTraces) {
                this.rawTraces = trimmedData.rawTraces;
            }
            
            // Clear edit history (indices are now invalid)
            if (this.editHistory) {
                this.editHistory.clear();
                this.updateEditHistoryUI();
            }
            
            // Update minimap with trimmed data
            if (this.minimap) {
                this.minimap.loadData(this.fileData.traces, this.fileData.peakLocations);
            }
            this.syncMinimap();
            
            // Update all UI displays
            this.updateSequenceDisplay(this.fileData.sequence);
            this.updateSelectionDisplay(null);
            this.updateStatistics(this.fileData);
            
            // Force fit to view to show the trimmed data properly
            this.chromatogram.fitToView();
            this.updateZoomStatus();
            
            console.log(`Quality trim applied: ${result.originalLength} → ${result.trimmedLength} bases`);
        }
        
        // Hide dialog
        this.hideQualityTrimDialog();
    }
    
    /**
     * Update UI to reflect edit history state (enable/disable undo/redo)
     */
    updateEditHistoryUI() {
        if (!this.editHistory) return;
        
        // Update menu items via IPC
        // Enable undo if there are commands to undo
        window.api.send('toMain', {
            command: 'update_menu_item',
            id: 'edit_undo',
            enabled: this.editHistory.canUndo()
        });
        
        // Enable redo if there are commands to redo
        window.api.send('toMain', {
            command: 'update_menu_item',
            id: 'edit_redo',
            enabled: this.editHistory.canRedo()
        });
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // DEBUG
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Show all tags in console (debug)
     */
    showAllTags() {
        if (this.fileData && this.fileData.tags) {
            console.log('All ABIF Tags:');
            console.table(this.fileData.tags.map(tag => ({
                tag: tag,
                description: ABIFTags.getTagDescription(tag)
            })));
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // KEYBOARD SHORTCUTS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        // Don't intercept if typing in input
        if (document.activeElement === this.elements.searchInput || 
            document.activeElement === this.elements.gotoInput) {
            return;
        }
        
        // Ctrl/Cmd + O: Open file
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            this.openFile();
        }
        
        // Ctrl/Cmd + G: Go to position
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            this.showGotoDialog();
        }
        
        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.elements.searchInput.focus();
            this.elements.searchInput.select();
        }
        
        // Ctrl/Cmd + C: Copy sequence
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            // Only if not in an input field
            if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                this.copySequence();
            }
        }
        
        // Ctrl/Cmd + Plus: Zoom in
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            this.zoomIn();
        }
        
        // Ctrl/Cmd + Minus: Zoom out
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            this.zoomOut();
        }
        
        // Ctrl/Cmd + 0: Fit to window
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            this.zoomFit();
        }
        
        // Ctrl/Cmd + Z: Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }
        
        // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
        if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
            ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey)) {
            e.preventDefault();
            this.redo();
        }
        
        // F3: Next search match
        if (e.key === 'F3') {
            e.preventDefault();
            if (e.shiftKey) {
                this.searchPrevious();
            } else {
                this.searchNext();
            }
        }
        
        // Escape: Clear selection or close editor
        if (e.key === 'Escape') {
            // Close base editor if open
            if (this.baseEditor && this.baseEditor.isOpen()) {
                this.baseEditor.hide();
                return;
            }
            // Clear selection
            if (this.chromatogram && this.chromatogram.hasSelection()) {
                this.chromatogram.clearSelection();
            }
        }
        
        // Arrow keys for navigation
        if (this.chromatogram && this.fileData) {
            if (e.key === 'ArrowLeft') {
                // Scroll left
                this.chromatogram.wrapper.scrollLeft -= 50;
                this.syncMinimap();
            } else if (e.key === 'ArrowRight') {
                // Scroll right
                this.chromatogram.wrapper.scrollLeft += 50;
                this.syncMinimap();
            } else if (e.key === 'Home') {
                // Go to start
                this.chromatogram.scrollToBase(0);
                this.syncMinimap();
            } else if (e.key === 'End') {
                // Go to end
                this.chromatogram.scrollToBase(this.fileData.sequenceLength - 1);
                this.syncMinimap();
            }
        }
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // UTILITIES
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Format date object for display
     */
    formatDate(dateObj) {
        if (!dateObj || !dateObj.year) return null;
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return `${months[dateObj.month - 1]} ${dateObj.day}, ${dateObj.year}`;
    }
    
    /**
     * Show error message
     */
    showError(title, message) {
        console.error(title, message);
        alert(`${title}\n\n${message}`);
    }
}

///////////////////////////////////////////////////////////////////////////////
// INITIALIZE APPLICATION
///////////////////////////////////////////////////////////////////////////////

// Create global app instance
const app = new AB1ReaderApp();

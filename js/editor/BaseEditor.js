///////////////////////////////////////////////////////////////////////////////
// BaseEditor.js
// Popover component for editing individual base calls in the chromatogram
///////////////////////////////////////////////////////////////////////////////

/**
 * BaseEditor - Popover UI for editing individual base calls
 * 
 * Displays a popover with buttons to change a base to G, A, T, C, N, or delete it.
 * Positioned near the clicked base on the chromatogram.
 */
class BaseEditor {
    
    /**
     * Create a BaseEditor instance
     * @param {HTMLElement} container - Container element (typically document.body)
     * @param {Object} options - Configuration options
     */
    constructor(container, options = {}) {
        this.container = container || document.body;
        this.options = {
            onBaseChange: null,  // Callback: (index, oldBase, newBase) => void
            onClose: null,       // Callback: () => void
            ...options
        };
        
        // State
        this.isVisible = false;
        this.currentIndex = -1;
        this.currentBase = '';
        
        // Create DOM elements
        this._createElements();
        
        // Bind events
        this._bindEvents();
    }
    
    /**
     * Create the popover DOM structure
     * @private
     */
    _createElements() {
        // Create popover container
        this.element = document.createElement('div');
        this.element.className = 'base-editor-popover';
        this.element.style.display = 'none';
        this.element.style.position = 'fixed';  // Fixed positioning for body container
        
        // Header with position and current base
        const header = document.createElement('div');
        header.className = 'base-editor-header';
        
        const positionLabel = document.createElement('span');
        positionLabel.className = 'base-editor-label';
        positionLabel.textContent = 'Position:';
        
        this.positionValue = document.createElement('span');
        this.positionValue.className = 'base-editor-position';
        this.positionValue.textContent = '--';
        
        const currentLabel = document.createElement('span');
        currentLabel.className = 'base-editor-label';
        currentLabel.textContent = 'Current:';
        
        this.currentBaseValue = document.createElement('span');
        this.currentBaseValue.className = 'base-editor-current';
        this.currentBaseValue.textContent = '--';
        
        header.appendChild(positionLabel);
        header.appendChild(this.positionValue);
        header.appendChild(currentLabel);
        header.appendChild(this.currentBaseValue);
        
        // Divider
        const divider = document.createElement('div');
        divider.className = 'base-editor-divider';
        
        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'base-editor-buttons';
        
        // Create buttons for each nucleotide
        this.buttons = {};
        const nucleotides = [
            { base: 'G', label: 'G', color: '#000000' },
            { base: 'A', label: 'A', color: '#00CC00' },
            { base: 'T', label: 'T', color: '#FF0000' },
            { base: 'C', label: 'C', color: '#0000FF' },
            { base: 'N', label: 'N', color: '#808080' },
            { base: '', label: 'Del', color: '#666666' }  // Delete button
        ];
        
        nucleotides.forEach(({ base, label, color }) => {
            const button = document.createElement('button');
            button.className = 'base-editor-button';
            button.textContent = label;
            button.dataset.base = base === '' ? 'DELETE' : base;
            button.style.color = color;
            
            if (base === '') {
                // Delete button gets special styling
                button.classList.add('base-editor-button-delete');
            }
            
            button.addEventListener('click', () => this._handleButtonClick(base));
            buttonContainer.appendChild(button);
            this.buttons[base === '' ? 'DELETE' : base] = button;
        });
        
        // Assemble popover
        this.element.appendChild(header);
        this.element.appendChild(divider);
        this.element.appendChild(buttonContainer);
        
        // Append to container
        this.container.appendChild(this.element);
    }
    
    /**
     * Bind event handlers
     * @private
     */
    _bindEvents() {
        // Close on click outside
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.element.contains(e.target)) {
                this.hide();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    /**
     * Handle button click
     * @param {string} newBase - New base value (empty string for delete)
     * @private
     */
    _handleButtonClick(newBase) {
        if (this.currentIndex < 0) return;
        
        const oldBase = this.currentBase;
        let actualNewBase = newBase;
        
        // Handle delete (convert to empty string or N)
        if (newBase === '') {
            actualNewBase = '';  // Could also use 'N' for ambiguous
        }
        
        // Don't trigger change if same base
        if (actualNewBase === oldBase) {
            this.hide();
            return;
        }
        
        // Trigger callback
        if (this.options.onBaseChange) {
            this.options.onBaseChange(this.currentIndex, oldBase, actualNewBase);
        }
        
        // Hide after change
        this.hide();
    }
    
    /**
     * Show the editor popover at a specific position
     * @param {number} index - Base index (0-based)
     * @param {string} base - Current base character
     * @param {number} x - Screen X coordinate (in pixels)
     * @param {number} y - Screen Y coordinate (in pixels)
     */
    show(index, base, x, y) {
        this.currentIndex = index;
        this.currentBase = base;
        
        // Update display values
        this.positionValue.textContent = (index + 1).toString();  // 1-based position
        this.currentBaseValue.textContent = base || '--';
        this.currentBaseValue.style.color = this._getBaseColor(base);
        
        // Highlight current base button
        Object.values(this.buttons).forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.base === base) {
                btn.classList.add('active');
            }
        });
        
        // Position the popover
        this._positionPopover(x, y);
        
        // Show
        this.element.style.display = 'block';
        this.isVisible = true;
        
        // Add animation class
        requestAnimationFrame(() => {
            this.element.classList.add('visible');
        });
    }
    
    /**
     * Hide the editor popover
     */
    hide() {
        if (!this.isVisible) return;
        
        this.element.classList.remove('visible');
        
        // Wait for animation to complete before hiding
        setTimeout(() => {
            this.element.style.display = 'none';
            this.isVisible = false;
            this.currentIndex = -1;
            this.currentBase = '';
            
            if (this.options.onClose) {
                this.options.onClose();
            }
        }, 150);
    }
    
    /**
     * Position the popover near the clicked base
     * @param {number} x - Target X coordinate (screen/client coordinates)
     * @param {number} y - Target Y coordinate (screen/client coordinates)
     * @private
     */
    _positionPopover(x, y) {
        // Force layout calculation to get accurate dimensions
        this.element.style.visibility = 'hidden';
        this.element.style.display = 'block';
        const rect = this.element.getBoundingClientRect();
        this.element.style.visibility = '';
        
        const margin = 10;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Calculate ideal position (above and to the right of the click)
        let left = x + 20;
        let top = y - rect.height - 10;
        
        // Adjust if too close to right edge
        if (left + rect.width > windowWidth - margin) {
            left = x - rect.width - 20;
        }
        
        // Adjust if too close to left edge
        if (left < margin) {
            left = margin;
        }
        
        // Adjust if too close to top edge (position below instead)
        if (top < margin) {
            top = y + 20;
        }
        
        // Adjust if too close to bottom edge
        if (top + rect.height > windowHeight - margin) {
            top = windowHeight - rect.height - margin;
        }
        
        // Set position (absolute positioning relative to body)
        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    }
    
    /**
     * Get color for a base character
     * @param {string} base - Base character
     * @returns {string} Color hex code
     * @private
     */
    _getBaseColor(base) {
        const colors = {
            'G': '#000000',
            'A': '#00CC00',
            'T': '#FF0000',
            'C': '#0000FF',
            'N': '#808080'
        };
        return colors[base] || '#666666';
    }
    
    /**
     * Check if the editor is currently visible
     * @returns {boolean}
     */
    isOpen() {
        return this.isVisible;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.hide();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseEditor };
}

// For use in browser
if (typeof window !== 'undefined') {
    window.BaseEditor = BaseEditor;
}

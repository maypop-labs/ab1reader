///////////////////////////////////////////////////////////////////////////////
// EditHistory.js
// Undo/redo system using the command pattern
///////////////////////////////////////////////////////////////////////////////

/**
 * EditHistory - Manages undo/redo history for sequence edits
 * 
 * Uses the command pattern to store and execute/undo edit operations.
 */
class EditHistory {
    
    /**
     * Create an EditHistory instance
     * @param {number} maxSize - Maximum number of commands to store (default 100)
     */
    constructor(maxSize = 100) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
        this.onChange = null;  // Callback: () => void - called when stack size changes
    }
    
    /**
     * Execute a command and add it to undo stack
     * @param {Command} command - Command object with execute() and undo() methods
     */
    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo on new edit
        
        // Limit stack size
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        
        this._notifyChange();
    }
    
    /**
     * Undo the last command
     * @returns {boolean} True if an undo was performed
     */
    undo() {
        if (this.undoStack.length === 0) return false;
        
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
        
        this._notifyChange();
        return true;
    }
    
    /**
     * Redo the last undone command
     * @returns {boolean} True if a redo was performed
     */
    redo() {
        if (this.redoStack.length === 0) return false;
        
        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);
        
        this._notifyChange();
        return true;
    }
    
    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }
    
    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }
    
    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this._notifyChange();
    }
    
    /**
     * Get the number of undo operations available
     * @returns {number}
     */
    getUndoCount() {
        return this.undoStack.length;
    }
    
    /**
     * Get the number of redo operations available
     * @returns {number}
     */
    getRedoCount() {
        return this.redoStack.length;
    }
    
    /**
     * Notify listeners of state change
     * @private
     */
    _notifyChange() {
        if (this.onChange) {
            this.onChange();
        }
    }
}

/**
 * ChangeBaseCommand - Command for changing a single base
 * 
 * Implements the command pattern for base editing operations.
 */
class ChangeBaseCommand {
    
    /**
     * Create a ChangeBaseCommand
     * @param {ChromatogramCanvas} chromatogram - The chromatogram canvas instance
     * @param {Object} fileData - The file data object with sequence
     * @param {number} index - Base index (0-based)
     * @param {string} oldBase - Original base character
     * @param {string} newBase - New base character
     * @param {Function} onUpdate - Callback to call after base change
     */
    constructor(chromatogram, fileData, index, oldBase, newBase, onUpdate) {
        this.chromatogram = chromatogram;
        this.fileData = fileData;
        this.index = index;
        this.oldBase = oldBase;
        this.newBase = newBase;
        this.onUpdate = onUpdate || null;
    }
    
    /**
     * Execute the command (change base to newBase)
     */
    execute() {
        this._setBase(this.newBase);
    }
    
    /**
     * Undo the command (restore to oldBase)
     */
    undo() {
        this._setBase(this.oldBase);
    }
    
    /**
     * Set the base at the specified index
     * @param {string} base - Base character to set
     * @private
     */
    _setBase(base) {
        if (!this.fileData || !this.chromatogram) return;
        
        // Handle delete (empty string) - convert to 'N' for ambiguous
        const actualBase = base === '' ? 'N' : base;
        
        // Update the sequence string
        const sequence = this.fileData.sequence.split('');
        sequence[this.index] = actualBase;
        this.fileData.sequence = sequence.join('');
        
        // Update chromatogram sequence
        if (this.chromatogram) {
            this.chromatogram.sequence = this.fileData.sequence;
            
            // Mark/unmark as modified
            // Mark if current base differs from the original base when command was created
            // Unmark if it's restored to original
            if (actualBase !== this.oldBase) {
                this.chromatogram.markModified(this.index);
            } else {
                // Check if this base should still be marked (might have been modified before)
                // For simplicity, we unmark if restored to original
                // In a more sophisticated system, we'd track original sequence separately
                this.chromatogram.unmarkModified(this.index);
            }
            
            this.chromatogram.render();
        }
        
        // Notify update callback
        if (this.onUpdate) {
            this.onUpdate(this.index, actualBase);
        }
    }
    
    /**
     * Get a description of this command
     * @returns {string}
     */
    getDescription() {
        return `Change base at position ${this.index + 1}: ${this.oldBase} → ${this.newBase}`;
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EditHistory, ChangeBaseCommand };
}

// For use in browser
if (typeof window !== 'undefined') {
    window.EditHistory = EditHistory;
    window.ChangeBaseCommand = ChangeBaseCommand;
}

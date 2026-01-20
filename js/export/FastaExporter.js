///////////////////////////////////////////////////////////////////////////////
// FastaExporter.js
// FASTA format exporter for DNA sequences
///////////////////////////////////////////////////////////////////////////////

/**
 * FastaExporter - Utility class for exporting sequences in FASTA format
 * 
 * FASTA format:
 * >header
 * SEQUENCE
 * SEQUENCE (continues...)
 */
class FastaExporter {
    
    /**
     * Generate FASTA format string
     * 
     * @param {string} sequence - DNA sequence
     * @param {string} header - Sequence header/name (without > prefix)
     * @param {number} lineWidth - Characters per line (default 80)
     * @returns {string} FASTA formatted string
     */
    static generate(sequence, header, lineWidth = 80) {
        if (!sequence) {
            return '';
        }
        
        // Sanitize header (remove > if present, trim whitespace)
        let cleanHeader = header || 'Untitled';
        cleanHeader = cleanHeader.replace(/^>+/, '').trim();
        if (!cleanHeader) {
            cleanHeader = 'Untitled';
        }
        
        // Build FASTA string
        let fasta = `>${cleanHeader}\n`;
        
        // Break sequence into lines
        for (let i = 0; i < sequence.length; i += lineWidth) {
            fasta += sequence.substring(i, i + lineWidth) + '\n';
        }
        
        return fasta;
    }
    
    /**
     * Generate FASTA from file data
     * 
     * @param {Object} fileData - File data object with sequence and metadata
     * @param {Object} options - Export options
     * @returns {string} FASTA formatted string
     */
    static generateFromFileData(fileData, options = {}) {
        if (!fileData || !fileData.sequence) {
            throw new Error('File data must contain a sequence');
        }
        
        const sequence = fileData.sequence;
        const lineWidth = options.lineWidth || 80;
        
        // Generate header from metadata
        let header = options.header;
        if (!header && fileData.metadata) {
            const meta = fileData.metadata;
            const parts = [];
            
            if (meta.sampleName) parts.push(meta.sampleName);
            if (meta.runName) parts.push(meta.runName);
            if (meta.well) parts.push(`well:${meta.well}`);
            
            header = parts.length > 0 ? parts.join('_') : fileData.fileName || 'sequence';
        } else if (!header) {
            header = fileData.fileName || 'sequence';
        }
        
        // Handle selection if specified
        let sequenceToExport = sequence;
        if (options.start !== undefined && options.end !== undefined) {
            const start = Math.max(0, Math.min(options.start, sequence.length - 1));
            const end = Math.max(start, Math.min(options.end, sequence.length - 1));
            sequenceToExport = sequence.substring(start, end + 1);
            
            // Update header to indicate selection
            if (header) {
                header += `_${start + 1}-${end + 1}`;
            }
        }
        
        return this.generate(sequenceToExport, header, lineWidth);
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FastaExporter };
}

// For use in browser
if (typeof window !== 'undefined') {
    window.FastaExporter = FastaExporter;
}

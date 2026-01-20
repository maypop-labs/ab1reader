///////////////////////////////////////////////////////////////////////////////
// FastqExporter.js
// FASTQ format exporter for DNA sequences with quality scores
///////////////////////////////////////////////////////////////////////////////

/**
 * FastqExporter - Utility class for exporting sequences in FASTQ format
 * 
 * FASTQ format:
 * @header
 * SEQUENCE
 * +
 * QUALITY (ASCII-encoded Phred scores)
 * 
 * Uses Phred+33 encoding (Sanger/Illumina 1.8+):
 * Quality 0 = '!' (ASCII 33)
 * Quality 40 = 'I' (ASCII 73)
 */
class FastqExporter {
    
    /**
     * Convert Phred quality score to ASCII character (Phred+33)
     * 
     * @param {number} phredScore - Phred quality score (0-93)
     * @returns {string} ASCII character
     */
    static phredToAscii(phredScore) {
        // Clamp to valid range (0-93, since ASCII 33-126 are printable)
        const clamped = Math.max(0, Math.min(93, Math.round(phredScore)));
        return String.fromCharCode(clamped + 33);
    }
    
    /**
     * Convert array of Phred scores to quality string
     * 
     * @param {number[]} qualityScores - Array of Phred scores
     * @returns {string} ASCII-encoded quality string
     */
    static qualityToString(qualityScores) {
        if (!qualityScores || qualityScores.length === 0) {
            return '';
        }
        return qualityScores.map(q => this.phredToAscii(q)).join('');
    }
    
    /**
     * Generate FASTQ format string
     * 
     * @param {string} sequence - DNA sequence
     * @param {number[]} qualityScores - Array of Phred quality scores
     * @param {string} header - Sequence header/name (without @ prefix)
     * @param {number} lineWidth - Characters per line (default 80)
     * @returns {string} FASTQ formatted string
     */
    static generate(sequence, qualityScores, header, lineWidth = 80) {
        if (!sequence) {
            return '';
        }
        
        // Sanitize header (remove @ if present, trim whitespace)
        let cleanHeader = header || 'Untitled';
        cleanHeader = cleanHeader.replace(/^@+/, '').trim();
        if (!cleanHeader) {
            cleanHeader = 'Untitled';
        }
        
        // Convert quality scores to ASCII string
        let qualityString = '';
        if (qualityScores && qualityScores.length > 0) {
            qualityString = this.qualityToString(qualityScores);
        } else {
            // If no quality scores, use '!' (quality 0) for all bases
            qualityString = '!'.repeat(sequence.length);
        }
        
        // Ensure quality string matches sequence length
        if (qualityString.length < sequence.length) {
            qualityString += '!'.repeat(sequence.length - qualityString.length);
        } else if (qualityString.length > sequence.length) {
            qualityString = qualityString.substring(0, sequence.length);
        }
        
        // Build FASTQ string
        let fastq = `@${cleanHeader}\n`;
        
        // Break sequence and quality into lines
        for (let i = 0; i < sequence.length; i += lineWidth) {
            fastq += sequence.substring(i, i + lineWidth) + '\n';
        }
        
        fastq += '+\n';
        
        for (let i = 0; i < qualityString.length; i += lineWidth) {
            fastq += qualityString.substring(i, i + lineWidth) + '\n';
        }
        
        return fastq;
    }
    
    /**
     * Generate FASTQ from file data
     * 
     * @param {Object} fileData - File data object with sequence, quality scores, and metadata
     * @param {Object} options - Export options
     * @returns {string} FASTQ formatted string
     */
    static generateFromFileData(fileData, options = {}) {
        if (!fileData || !fileData.sequence) {
            throw new Error('File data must contain a sequence');
        }
        
        const sequence = fileData.sequence;
        const qualityScores = fileData.qualityScores || [];
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
        let qualityToExport = qualityScores;
        
        if (options.start !== undefined && options.end !== undefined) {
            const start = Math.max(0, Math.min(options.start, sequence.length - 1));
            const end = Math.max(start, Math.min(options.end, sequence.length - 1));
            sequenceToExport = sequence.substring(start, end + 1);
            
            if (qualityScores && qualityScores.length > 0) {
                qualityToExport = qualityScores.slice(start, end + 1);
            }
            
            // Update header to indicate selection
            if (header) {
                header += `_${start + 1}-${end + 1}`;
            }
        }
        
        return this.generate(sequenceToExport, qualityToExport, header, lineWidth);
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FastqExporter };
}

// For use in browser
if (typeof window !== 'undefined') {
    window.FastqExporter = FastqExporter;
}

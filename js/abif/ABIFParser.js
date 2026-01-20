///////////////////////////////////////////////////////////////////////////////
// ABIFParser.js
// Binary parser for ABIF (Applied Biosystems Information File) format
// Including .ab1 Sanger sequencing chromatogram files
///////////////////////////////////////////////////////////////////////////////

// Import types if in Node.js environment
let ABIFTypes;
if (typeof require !== 'undefined') {
    ABIFTypes = require('./ABIFTypes.js');
} else if (typeof window !== 'undefined' && window.ABIFTypes) {
    ABIFTypes = window.ABIFTypes;
}

/**
 * ABIF File Parser
 * Parses Applied Biosystems AB1/ABIF binary files into structured JavaScript objects
 */
class ABIFParser {
    
    /**
     * Create an ABIFParser instance
     * @param {ArrayBuffer} arrayBuffer - The raw binary file data
     */
    constructor(arrayBuffer) {
        if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
            throw new Error('ABIFParser requires an ArrayBuffer');
        }
        
        this.buffer = arrayBuffer;
        this.dataView = new DataView(arrayBuffer);
        this.header = null;
        this.directory = [];
        this.tags = {};  // Parsed tag data cache
        this._parsed = false;
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // MAIN PARSING METHODS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Parse the entire ABIF file
     * @returns {ABIFParser} Returns this for chaining
     * @throws {Error} If file is not valid ABIF format
     */
    parse() {
        if (this._parsed) return this;
        
        this.header = this._parseHeader();
        
        if (this.header.filetype !== 'ABIF') {
            throw new Error(`Invalid ABIF file: expected "ABIF" magic number, got "${this.header.filetype}"`);
        }
        
        this.directory = this._parseDirectory();
        this._parsed = true;
        
        return this;
    }
    
    /**
     * Parse the 128-byte ABIF header
     * @returns {Object} Header object with all fields
     * @private
     */
    _parseHeader() {
        const dv = this.dataView;
        
        return {
            filetype:     ABIFTypes.readString4(dv, 0),      // "ABIF"
            version:      dv.getUint16(4, false),            // Version (e.g., 101 = 1.01)
            name:         ABIFTypes.readString4(dv, 6),      // "tdir"
            number:       dv.getUint32(10, false),           // Should be 1
            elementtype:  dv.getUint16(14, false),           // Type code for directory
            elementsize:  dv.getUint16(16, false),           // Size of each dir entry (28)
            numelements:  dv.getUint32(18, false),           // Number of directory entries
            datasize:     dv.getUint32(22, false),           // Total directory data size
            dataoffset:   dv.getUint32(26, false),           // Offset to directory
            datahandle:   dv.getUint32(30, false)            // Reserved
        };
    }
    
    /**
     * Parse all directory entries
     * @returns {Object[]} Array of directory entry objects
     * @private
     */
    _parseDirectory() {
        const entries = [];
        const dirOffset = this.header.dataoffset;
        const entrySize = this.header.elementsize; // Should be 28
        const numEntries = this.header.numelements;
        
        for (let i = 0; i < numEntries; i++) {
            const entryOffset = dirOffset + (i * entrySize);
            entries.push(this._parseDirectoryEntry(entryOffset));
        }
        
        return entries;
    }
    
    /**
     * Parse a single directory entry (28 bytes)
     * @param {number} offset - Byte offset of the entry
     * @returns {Object} Directory entry object
     * @private
     */
    _parseDirectoryEntry(offset) {
        const dv = this.dataView;
        
        return {
            name:         ABIFTypes.readString4(dv, offset),      // 4-char tag name
            number:       dv.getUint32(offset + 4, false),        // Tag number
            elementtype:  dv.getUint16(offset + 8, false),        // Data type code
            elementsize:  dv.getUint16(offset + 10, false),       // Size of one element
            numelements:  dv.getUint32(offset + 12, false),       // Number of elements
            datasize:     dv.getUint32(offset + 16, false),       // Total data size
            dataoffset:   dv.getUint32(offset + 20, false),       // Data offset or inline data
            datahandle:   dv.getUint32(offset + 24, false)        // Reserved
        };
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // TAG DATA EXTRACTION
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Get the key string for a tag (e.g., "DATA_9")
     * @param {string} name - 4-character tag name
     * @param {number} number - Tag number
     * @returns {string} Combined key
     */
    static getTagKey(name, number) {
        return `${name}_${number}`;
    }
    
    /**
     * Find a directory entry by name and number
     * @param {string} name - 4-character tag name
     * @param {number} number - Tag number
     * @returns {Object|null} Directory entry or null if not found
     */
    findEntry(name, number) {
        return this.directory.find(e => e.name === name && e.number === number) || null;
    }
    
    /**
     * Get all entries matching a tag name (any number)
     * @param {string} name - 4-character tag name
     * @returns {Object[]} Array of matching entries
     */
    findEntriesByName(name) {
        return this.directory.filter(e => e.name === name);
    }
    
    /**
     * Get the data for a specific tag
     * @param {string} name - 4-character tag name
     * @param {number} number - Tag number
     * @returns {*} Parsed data (type depends on element type)
     */
    getTagData(name, number) {
        const key = ABIFParser.getTagKey(name, number);
        
        // Return cached value if available
        if (this.tags.hasOwnProperty(key)) {
            return this.tags[key];
        }
        
        const entry = this.findEntry(name, number);
        if (!entry) {
            return null;
        }
        
        const data = this._extractData(entry);
        this.tags[key] = data;
        return data;
    }
    
    /**
     * Extract data from a directory entry based on its type
     * @param {Object} entry - Directory entry
     * @returns {*} Extracted data
     * @private
     */
    _extractData(entry) {
        const { elementtype, elementsize, numelements, datasize, dataoffset } = entry;
        
        // Determine data location
        // If datasize <= 4, data is stored inline in dataoffset field
        // Otherwise, dataoffset is the file offset where data begins
        let dataView;
        let offset;
        
        if (datasize <= 4) {
            // Data is inline - create a view of just the 4 bytes at dataoffset position
            // We need to extract those 4 bytes as if they were the data
            const inlineBuffer = new ArrayBuffer(4);
            const inlineView = new DataView(inlineBuffer);
            inlineView.setUint32(0, dataoffset, false); // Store as big-endian
            dataView = inlineView;
            offset = 0;
        } else {
            dataView = this.dataView;
            offset = dataoffset;
        }
        
        // Extract based on element type
        switch (elementtype) {
            case ABIFTypes.ABIF_TYPE_CODES.BYTE:   // 1
                return this._extractTypedArray(dataView, offset, numelements, 'byte');
                
            case ABIFTypes.ABIF_TYPE_CODES.CHAR:   // 2
                return this._extractTypedArray(dataView, offset, numelements, 'char');
                
            case ABIFTypes.ABIF_TYPE_CODES.WORD:   // 3
                return this._extractTypedArray(dataView, offset, numelements, 'word');
                
            case ABIFTypes.ABIF_TYPE_CODES.SHORT:  // 4
                return this._extractTypedArray(dataView, offset, numelements, 'short');
                
            case ABIFTypes.ABIF_TYPE_CODES.LONG:   // 5
                return this._extractTypedArray(dataView, offset, numelements, 'long');
                
            case ABIFTypes.ABIF_TYPE_CODES.FLOAT:  // 7
                return this._extractTypedArray(dataView, offset, numelements, 'float');
                
            case ABIFTypes.ABIF_TYPE_CODES.DOUBLE: // 8
                return this._extractTypedArray(dataView, offset, numelements, 'double');
                
            case ABIFTypes.ABIF_TYPE_CODES.DATE:   // 10
                return ABIFTypes.readDate(dataView, offset);
                
            case ABIFTypes.ABIF_TYPE_CODES.TIME:   // 11
                return ABIFTypes.readTime(dataView, offset);
                
            case ABIFTypes.ABIF_TYPE_CODES.PSTRING: // 18
                return ABIFTypes.readPString(dataView, offset, datasize);
                
            case ABIFTypes.ABIF_TYPE_CODES.CSTRING: // 19
                return ABIFTypes.readCString(dataView, offset, datasize);
                
            default:
                // Unknown type - return raw bytes as hex string
                console.warn(`Unknown ABIF element type: ${elementtype} for tag ${entry.name}_${entry.number}`);
                return this._extractRawBytes(dataView, offset, datasize);
        }
    }
    
    /**
     * Extract a typed array of values
     * @param {DataView} dataView - DataView to read from
     * @param {number} offset - Starting offset
     * @param {number} count - Number of elements
     * @param {string} type - Type name ('byte', 'char', 'word', 'short', 'long', 'float', 'double')
     * @returns {number[]|number} Array of values, or single value if count is 1
     * @private
     */
    _extractTypedArray(dataView, offset, count, type) {
        let result;
        
        switch (type) {
            case 'byte':
                result = ABIFTypes.readByteArray(dataView, offset, count);
                break;
            case 'char':
                result = ABIFTypes.readCharArray(dataView, offset, count);
                break;
            case 'word':
                result = ABIFTypes.readWordArray(dataView, offset, count);
                break;
            case 'short':
                result = ABIFTypes.readShortArray(dataView, offset, count);
                break;
            case 'long':
                result = ABIFTypes.readLongArray(dataView, offset, count);
                break;
            case 'float':
                result = ABIFTypes.readFloatArray(dataView, offset, count);
                break;
            case 'double':
                result = ABIFTypes.readDoubleArray(dataView, offset, count);
                break;
            default:
                result = ABIFTypes.readByteArray(dataView, offset, count);
        }
        
        // Return single value if only one element
        return (count === 1) ? result[0] : result;
    }
    
    /**
     * Extract raw bytes as a hex string (for unknown types)
     * @param {DataView} dataView - DataView to read from
     * @param {number} offset - Starting offset
     * @param {number} length - Number of bytes
     * @returns {string} Hex string representation
     * @private
     */
    _extractRawBytes(dataView, offset, length) {
        let hex = '';
        for (let i = 0; i < length; i++) {
            hex += dataView.getUint8(offset + i).toString(16).padStart(2, '0');
        }
        return hex;
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // CONVENIENCE METHODS FOR COMMON DATA
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Get the filter wheel order (maps channels to nucleotides)
     * @returns {string[]} Array of 4 nucleotide characters ['G', 'A', 'T', 'C'] or similar
     */
    getChannelOrder() {
        const fwo = this.getTagData('FWO_', 1);
        if (!fwo) return ['G', 'A', 'T', 'C']; // Default order
        
        // FWO__1 contains ASCII codes for the nucleotides
        if (Array.isArray(fwo)) {
            return fwo.map(code => String.fromCharCode(code));
        }
        return ['G', 'A', 'T', 'C'];
    }
    
    /**
     * Get the processed trace data for all four channels
     * @returns {Object} Object with G, A, T, C arrays of intensity values
     */
    getTraces() {
        const order = this.getChannelOrder();
        const traces = {};
        
        // DATA_9 through DATA_12 are the processed traces
        for (let i = 0; i < 4; i++) {
            const channelData = this.getTagData('DATA', 9 + i);
            const nucleotide = order[i];
            traces[nucleotide] = channelData || [];
        }
        
        return traces;
    }
    
    /**
     * Get the raw (unprocessed) trace data for all four channels
     * @returns {Object} Object with G, A, T, C arrays of intensity values
     */
    getRawTraces() {
        const order = this.getChannelOrder();
        const traces = {};
        
        // DATA_1 through DATA_4 are the raw traces
        for (let i = 0; i < 4; i++) {
            const channelData = this.getTagData('DATA', 1 + i);
            const nucleotide = order[i];
            traces[nucleotide] = channelData || [];
        }
        
        return traces;
    }
    
    /**
     * Get the primary base calls as a string
     * @returns {string} DNA sequence string
     */
    getSequence() {
        const pbas = this.getTagData('PBAS', 1);
        if (!pbas) return '';
        
        if (Array.isArray(pbas)) {
            return ABIFTypes.charArrayToString(pbas);
        }
        return pbas;
    }
    
    /**
     * Get the secondary base calls as a string
     * @returns {string} DNA sequence string
     */
    getSecondarySequence() {
        const pbas = this.getTagData('PBAS', 2);
        if (!pbas) return '';
        
        if (Array.isArray(pbas)) {
            return ABIFTypes.charArrayToString(pbas);
        }
        return pbas;
    }
    
    /**
     * Get the base calls as an array of ASCII codes
     * @returns {number[]} Array of ASCII codes
     */
    getBaseCalls() {
        return this.getTagData('PBAS', 1) || [];
    }
    
    /**
     * Get the secondary base at each position
     * @returns {number[]} Array of ASCII codes
     */
    getSecondaryBaseCalls() {
        return this.getTagData('P2BA', 1) || [];
    }
    
    /**
     * Get peak locations (x-coordinates for each base call)
     * @returns {number[]} Array of peak positions
     */
    getPeakLocations() {
        return this.getTagData('PLOC', 1) || [];
    }
    
    /**
     * Get secondary peak locations
     * @returns {number[]} Array of peak positions
     */
    getSecondaryPeakLocations() {
        return this.getTagData('PLOC', 2) || [];
    }
    
    /**
     * Get quality scores (Phred-like confidence values)
     * @returns {number[]} Array of quality scores (0-255)
     */
    getQualityScores() {
        return this.getTagData('PCON', 1) || [];
    }
    
    /**
     * Get secondary quality scores
     * @returns {number[]} Array of quality scores (0-255)
     */
    getSecondaryQualityScores() {
        return this.getTagData('PCON', 2) || [];
    }
    
    /**
     * Get the sequence length (number of called bases)
     * @returns {number} Sequence length
     */
    getSequenceLength() {
        const seq = this.getBaseCalls();
        return Array.isArray(seq) ? seq.length : 0;
    }
    
    /**
     * Get the trace length (number of data points)
     * @returns {number} Trace length
     */
    getTraceLength() {
        const data = this.getTagData('DATA', 9);
        return Array.isArray(data) ? data.length : 0;
    }
    
    /**
     * Get sample/file metadata
     * @returns {Object} Metadata object
     */
    getMetadata() {
        return {
            // Sample info
            sampleName:     this.getTagData('SMPL', 1) || '',
            sampleComment:  this.getTagData('CMNT', 1) || '',
            
            // Run info
            runName:        this.getTagData('RunN', 1) || '',
            runStartDate:   this.getTagData('RUND', 1),
            runStartTime:   this.getTagData('RUNT', 1),
            runEndDate:     this.getTagData('RUND', 2),
            runEndTime:     this.getTagData('RUNT', 2),
            
            // Machine info
            machineName:    this.getTagData('MCHN', 1) || '',
            machineModel:   this.getTagData('MODL', 1) || '',
            
            // Lane/Well info
            lane:           this.getTagData('LANE', 1),
            well:           this.getTagData('TUBE', 1) || '',
            
            // Analysis info
            baseCaller:     this.getTagData('SPAC', 1),  // Base spacing
            dyeSet:         this.getTagData('DySN', 1) || '',
            
            // Sequence info
            sequenceLength: this.getSequenceLength(),
            traceLength:    this.getTraceLength()
        };
    }
    
    /**
     * Get all parsed data as a single object (similar to PHP's read_ABIF return)
     * @returns {Object} Complete ABIF data structure
     */
    getAllData() {
        if (!this._parsed) {
            this.parse();
        }
        
        // Parse all directory entries
        for (const entry of this.directory) {
            const key = ABIFParser.getTagKey(entry.name, entry.number);
            if (!this.tags.hasOwnProperty(key)) {
                this.tags[key] = this._extractData(entry);
            }
        }
        
        return {
            header: this.header,
            directory: this.directory,
            tags: { ...this.tags }
        };
    }
    
    /**
     * Get a summary of unknown element types encountered
     * @returns {Object} Map of tag names to unknown type codes
     */
    getUnknownTypes() {
        const unknown = {};
        const knownTypes = Object.values(ABIFTypes.ABIF_TYPE_CODES);
        
        for (const entry of this.directory) {
            if (!knownTypes.includes(entry.elementtype)) {
                unknown[ABIFParser.getTagKey(entry.name, entry.number)] = entry.elementtype;
            }
        }
        
        return unknown;
    }
    
    /**
     * List all available tags in the file
     * @returns {string[]} Array of tag keys (e.g., ["DATA_9", "PBAS_1", ...])
     */
    listTags() {
        return this.directory.map(e => ABIFParser.getTagKey(e.name, e.number));
    }
    
    ///////////////////////////////////////////////////////////////////////////
    // STATIC FACTORY METHODS
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Create parser from a File object (browser)
     * @param {File} file - File object from file input
     * @returns {Promise<ABIFParser>} Promise resolving to parsed ABIFParser
     */
    static async fromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parser = new ABIFParser(reader.result);
                    parser.parse();
                    resolve(parser);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Create parser from a file path (Node.js/Electron)
     * @param {string} filePath - Path to the AB1 file
     * @returns {Promise<ABIFParser>} Promise resolving to parsed ABIFParser
     */
    static async fromPath(filePath) {
        const fs = require('fs').promises;
        const buffer = await fs.readFile(filePath);
        const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        );
        const parser = new ABIFParser(arrayBuffer);
        parser.parse();
        return parser;
    }
    
    /**
     * Create parser from a file path (synchronous, Node.js/Electron)
     * @param {string} filePath - Path to the AB1 file
     * @returns {ABIFParser} Parsed ABIFParser instance
     */
    static fromPathSync(filePath) {
        const fs = require('fs');
        const buffer = fs.readFileSync(filePath);
        const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        );
        const parser = new ABIFParser(arrayBuffer);
        parser.parse();
        return parser;
    }
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron main process
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ABIFParser;
}

// For use in browser/renderer process
if (typeof window !== 'undefined') {
    window.ABIFParser = ABIFParser;
}

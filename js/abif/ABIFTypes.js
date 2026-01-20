///////////////////////////////////////////////////////////////////////////////
// ABIFTypes.js
// Type conversion utilities for ABIF file format
///////////////////////////////////////////////////////////////////////////////

/**
 * ABIF Element Type Codes
 * These codes identify the data type stored in each directory entry
 */
const ABIF_TYPE_CODES = {
    BYTE:    1,   // Unsigned 8-bit integer
    CHAR:    2,   // 8-bit character
    WORD:    3,   // Unsigned 16-bit integer
    SHORT:   4,   // Signed 16-bit integer
    LONG:    5,   // Signed 32-bit integer
    FLOAT:   7,   // 32-bit IEEE 754 float
    DOUBLE:  8,   // 64-bit IEEE 754 double
    DATE:    10,  // Date: year(2) + month(1) + day(1)
    TIME:    11,  // Time: hour(1) + min(1) + sec(1) + hsec(1)
    PSTRING: 18,  // Pascal string (length-prefixed)
    CSTRING: 19   // C string (null-terminated)
};

/**
 * Type code to human-readable name mapping
 */
const ABIF_TYPE_NAMES = {
    1:  'byte',
    2:  'char',
    3:  'word',
    4:  'short',
    5:  'long',
    7:  'float',
    8:  'double',
    10: 'date',
    11: 'time',
    18: 'pString',
    19: 'cString'
};

/**
 * Element sizes in bytes for fixed-size types
 */
const ABIF_TYPE_SIZES = {
    1:  1,  // byte
    2:  1,  // char
    3:  2,  // word
    4:  2,  // short
    5:  4,  // long
    7:  4,  // float
    8:  8,  // double
    10: 4,  // date
    11: 4   // time
    // pString and cString are variable length
};

///////////////////////////////////////////////////////////////////////////////
// SIGNED INTEGER CONVERSION
///////////////////////////////////////////////////////////////////////////////

/**
 * Convert unsigned 16-bit integer to signed 16-bit integer
 * ABIF stores signed shorts as unsigned, requiring conversion
 * @param {number} value - Unsigned 16-bit value (0 to 65535)
 * @returns {number} Signed 16-bit value (-32768 to 32767)
 */
function toSignedShort(value) {
    return value >= 0x8000 ? value - 0x10000 : value;
}

/**
 * Convert unsigned 32-bit integer to signed 32-bit integer
 * ABIF stores signed longs as unsigned, requiring conversion
 * @param {number} value - Unsigned 32-bit value (0 to 4294967295)
 * @returns {number} Signed 32-bit value (-2147483648 to 2147483647)
 */
function toSignedLong(value) {
    return value >= 0x80000000 ? value - 0x100000000 : value;
}

///////////////////////////////////////////////////////////////////////////////
// DATA EXTRACTION FROM DATAVIEW
///////////////////////////////////////////////////////////////////////////////

/**
 * Read a 4-character ASCII string from a DataView
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @returns {string} 4-character string
 */
function readString4(dataView, offset) {
    let str = '';
    for (let i = 0; i < 4; i++) {
        str += String.fromCharCode(dataView.getUint8(offset + i));
    }
    return str;
}

/**
 * Read a Pascal string (length-prefixed) from a DataView
 * First byte is the string length, followed by the characters
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} maxLength - Maximum bytes available
 * @returns {string} The extracted string
 */
function readPString(dataView, offset, maxLength) {
    if (maxLength < 1) return '';
    const length = dataView.getUint8(offset);
    let str = '';
    const actualLength = Math.min(length, maxLength - 1);
    for (let i = 0; i < actualLength; i++) {
        str += String.fromCharCode(dataView.getUint8(offset + 1 + i));
    }
    return str;
}

/**
 * Read a C string (null-terminated) from a DataView
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} maxLength - Maximum bytes available
 * @returns {string} The extracted string (excluding null terminator)
 */
function readCString(dataView, offset, maxLength) {
    let str = '';
    for (let i = 0; i < maxLength; i++) {
        const charCode = dataView.getUint8(offset + i);
        if (charCode === 0) break;
        str += String.fromCharCode(charCode);
    }
    return str;
}

/**
 * Read a fixed-length ASCII string from a DataView
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} length - Number of bytes to read
 * @returns {string} The extracted string
 */
function readFixedString(dataView, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
        const charCode = dataView.getUint8(offset + i);
        if (charCode === 0) break; // Stop at null
        str += String.fromCharCode(charCode);
    }
    return str;
}

/**
 * Read a date from a DataView (ABIF date format)
 * Format: 2-byte year, 1-byte month (1-12), 1-byte day (1-31)
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @returns {Object} Date object with year, month, day properties
 */
function readDate(dataView, offset) {
    return {
        year: dataView.getUint16(offset, false),      // Big-endian
        month: dataView.getUint8(offset + 2),
        day: dataView.getUint8(offset + 3)
    };
}

/**
 * Read a time from a DataView (ABIF time format)
 * Format: 1-byte hour (0-23), 1-byte minute (0-59), 
 *         1-byte second (0-59), 1-byte hundredths (0-99)
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @returns {Object} Time object with hour, minute, second, hsecond properties
 */
function readTime(dataView, offset) {
    return {
        hour: dataView.getUint8(offset),
        minute: dataView.getUint8(offset + 1),
        second: dataView.getUint8(offset + 2),
        hsecond: dataView.getUint8(offset + 3)
    };
}

///////////////////////////////////////////////////////////////////////////////
// ARRAY EXTRACTION
///////////////////////////////////////////////////////////////////////////////

/**
 * Read an array of unsigned 8-bit integers
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} count - Number of elements to read
 * @returns {number[]} Array of byte values
 */
function readByteArray(dataView, offset, count) {
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
        result[i] = dataView.getUint8(offset + i);
    }
    return result;
}

/**
 * Read an array of characters as ASCII codes
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} count - Number of elements to read
 * @returns {number[]} Array of character codes
 */
function readCharArray(dataView, offset, count) {
    // Same as byte array - characters stored as ASCII codes
    return readByteArray(dataView, offset, count);
}

/**
 * Read an array of unsigned 16-bit integers (big-endian)
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} count - Number of elements to read
 * @returns {number[]} Array of word values
 */
function readWordArray(dataView, offset, count) {
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
        result[i] = dataView.getUint16(offset + (i * 2), false); // Big-endian
    }
    return result;
}

/**
 * Read an array of signed 16-bit integers (big-endian)
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} count - Number of elements to read
 * @returns {number[]} Array of signed short values
 */
function readShortArray(dataView, offset, count) {
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
        const unsigned = dataView.getUint16(offset + (i * 2), false); // Big-endian
        result[i] = toSignedShort(unsigned);
    }
    return result;
}

/**
 * Read an array of signed 32-bit integers (big-endian)
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} count - Number of elements to read
 * @returns {number[]} Array of signed long values
 */
function readLongArray(dataView, offset, count) {
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
        const unsigned = dataView.getUint32(offset + (i * 4), false); // Big-endian
        result[i] = toSignedLong(unsigned);
    }
    return result;
}

/**
 * Read an array of 32-bit IEEE 754 floats (big-endian)
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} count - Number of elements to read
 * @returns {number[]} Array of float values
 */
function readFloatArray(dataView, offset, count) {
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
        result[i] = dataView.getFloat32(offset + (i * 4), false); // Big-endian
    }
    return result;
}

/**
 * Read an array of 64-bit IEEE 754 doubles (big-endian)
 * @param {DataView} dataView - The DataView to read from
 * @param {number} offset - Byte offset to start reading
 * @param {number} count - Number of elements to read
 * @returns {number[]} Array of double values
 */
function readDoubleArray(dataView, offset, count) {
    const result = new Array(count);
    for (let i = 0; i < count; i++) {
        result[i] = dataView.getFloat64(offset + (i * 8), false); // Big-endian
    }
    return result;
}

///////////////////////////////////////////////////////////////////////////////
// UTILITY FUNCTIONS
///////////////////////////////////////////////////////////////////////////////

/**
 * Convert an array of ASCII codes to a string
 * @param {number[]} charArray - Array of ASCII character codes
 * @returns {string} The resulting string
 */
function charArrayToString(charArray) {
    return String.fromCharCode.apply(null, charArray);
}

/**
 * Format a date object as ISO string (YYYY-MM-DD)
 * @param {Object} dateObj - Object with year, month, day properties
 * @returns {string} Formatted date string
 */
function formatDate(dateObj) {
    const year = dateObj.year.toString().padStart(4, '0');
    const month = dateObj.month.toString().padStart(2, '0');
    const day = dateObj.day.toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a time object as string (HH:MM:SS.hh)
 * @param {Object} timeObj - Object with hour, minute, second, hsecond properties
 * @returns {string} Formatted time string
 */
function formatTime(timeObj) {
    const hour = timeObj.hour.toString().padStart(2, '0');
    const minute = timeObj.minute.toString().padStart(2, '0');
    const second = timeObj.second.toString().padStart(2, '0');
    const hsecond = timeObj.hsecond.toString().padStart(2, '0');
    return `${hour}:${minute}:${second}.${hsecond}`;
}

/**
 * Get the type name for a given type code
 * @param {number} typeCode - ABIF element type code
 * @returns {string} Human-readable type name
 */
function getTypeName(typeCode) {
    return ABIF_TYPE_NAMES[typeCode] || `unknown(${typeCode})`;
}

/**
 * Get the element size for a given type code
 * @param {number} typeCode - ABIF element type code
 * @returns {number|null} Size in bytes, or null for variable-length types
 */
function getTypeSize(typeCode) {
    return ABIF_TYPE_SIZES[typeCode] || null;
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron main process
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Constants
        ABIF_TYPE_CODES,
        ABIF_TYPE_NAMES,
        ABIF_TYPE_SIZES,
        
        // Signed conversion
        toSignedShort,
        toSignedLong,
        
        // String readers
        readString4,
        readPString,
        readCString,
        readFixedString,
        
        // Date/Time readers
        readDate,
        readTime,
        
        // Array readers
        readByteArray,
        readCharArray,
        readWordArray,
        readShortArray,
        readLongArray,
        readFloatArray,
        readDoubleArray,
        
        // Utilities
        charArrayToString,
        formatDate,
        formatTime,
        getTypeName,
        getTypeSize
    };
}

// For use in browser/renderer process
if (typeof window !== 'undefined') {
    window.ABIFTypes = {
        // Constants
        ABIF_TYPE_CODES,
        ABIF_TYPE_NAMES,
        ABIF_TYPE_SIZES,
        
        // Signed conversion
        toSignedShort,
        toSignedLong,
        
        // String readers
        readString4,
        readPString,
        readCString,
        readFixedString,
        
        // Date/Time readers
        readDate,
        readTime,
        
        // Array readers
        readByteArray,
        readCharArray,
        readWordArray,
        readShortArray,
        readLongArray,
        readFloatArray,
        readDoubleArray,
        
        // Utilities
        charArrayToString,
        formatDate,
        formatTime,
        getTypeName,
        getTypeSize
    };
}

///////////////////////////////////////////////////////////////////////////////
// js/chromatogram/index.js
// Main entry point for chromatogram visualization modules
///////////////////////////////////////////////////////////////////////////////

const { ChromatogramCanvas, NUCLEOTIDE_COLORS, DEFAULT_CONFIG } = require('./ChromatogramCanvas.js');
const { Minimap } = require('./Minimap.js');

module.exports = {
    ChromatogramCanvas,
    Minimap,
    NUCLEOTIDE_COLORS,
    DEFAULT_CONFIG
};

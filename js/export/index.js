///////////////////////////////////////////////////////////////////////////////
// js/export/index.js
// Main entry point for export modules
///////////////////////////////////////////////////////////////////////////////

const { FastaExporter } = require('./FastaExporter.js');
const { FastqExporter } = require('./FastqExporter.js');
const { PngExporter } = require('./PngExporter.js');

module.exports = {
    FastaExporter,
    FastqExporter,
    PngExporter
};

// Also expose to window for browser use
if (typeof window !== 'undefined') {
    window.FastaExporter = FastaExporter;
    window.FastqExporter = FastqExporter;
    window.PngExporter = PngExporter;
}

///////////////////////////////////////////////////////////////////////////////
// js/abif/index.js
// Main entry point for ABIF parsing modules
///////////////////////////////////////////////////////////////////////////////

const ABIFParser = require('./ABIFParser.js');
const ABIFTypes = require('./ABIFTypes.js');
const ABIFTags = require('./ABIFTags.js');

module.exports = {
    ABIFParser,
    ABIFTypes,
    ABIFTags,
    
    // Convenience re-exports
    ...ABIFTypes,
    ...ABIFTags
};

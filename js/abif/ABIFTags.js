///////////////////////////////////////////////////////////////////////////////
// ABIFTags.js
// Dictionary of ABIF tag names, descriptions, and common usage
///////////////////////////////////////////////////////////////////////////////

/**
 * Common ABIF tags found in AB1 files from Applied Biosystems sequencers
 * Based on Applied Biosystems 3500/3500xl Genetic Analyzer tag specifications
 */
const ABIF_TAGS = {
    
    ///////////////////////////////////////////////////////////////////////////
    // TRACE DATA
    ///////////////////////////////////////////////////////////////////////////
    
    'DATA_1': {
        description: 'Raw channel 1 data',
        category: 'trace',
        importance: 'high'
    },
    'DATA_2': {
        description: 'Raw channel 2 data',
        category: 'trace',
        importance: 'high'
    },
    'DATA_3': {
        description: 'Raw channel 3 data',
        category: 'trace',
        importance: 'high'
    },
    'DATA_4': {
        description: 'Raw channel 4 data',
        category: 'trace',
        importance: 'high'
    },
    'DATA_9': {
        description: 'Processed/analyzed channel 1 data',
        category: 'trace',
        importance: 'critical'
    },
    'DATA_10': {
        description: 'Processed/analyzed channel 2 data',
        category: 'trace',
        importance: 'critical'
    },
    'DATA_11': {
        description: 'Processed/analyzed channel 3 data',
        category: 'trace',
        importance: 'critical'
    },
    'DATA_12': {
        description: 'Processed/analyzed channel 4 data',
        category: 'trace',
        importance: 'critical'
    },
    'DATA_105': {
        description: 'Raw data for 5th dye (if present)',
        category: 'trace',
        importance: 'low'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // BASE CALLING
    ///////////////////////////////////////////////////////////////////////////
    
    'PBAS_1': {
        description: 'Primary base calls (edited)',
        category: 'basecall',
        importance: 'critical'
    },
    'PBAS_2': {
        description: 'Secondary base calls (original)',
        category: 'basecall',
        importance: 'high'
    },
    'P1AM_1': {
        description: 'Primary peak amplitudes',
        category: 'basecall',
        importance: 'medium'
    },
    'P2AM_1': {
        description: 'Secondary peak amplitudes',
        category: 'basecall',
        importance: 'medium'
    },
    'P2BA_1': {
        description: 'Secondary base at each position',
        category: 'basecall',
        importance: 'medium'
    },
    'PLOC_1': {
        description: 'Peak locations (edited)',
        category: 'basecall',
        importance: 'critical'
    },
    'PLOC_2': {
        description: 'Peak locations (original)',
        category: 'basecall',
        importance: 'high'
    },
    'PCON_1': {
        description: 'Quality values (confidence scores)',
        category: 'quality',
        importance: 'critical'
    },
    'PCON_2': {
        description: 'Secondary quality values',
        category: 'quality',
        importance: 'medium'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // DYE INFORMATION
    ///////////////////////////////////////////////////////////////////////////
    
    'FWO__1': {
        description: 'Filter wheel order (nucleotide to channel mapping)',
        category: 'dye',
        importance: 'critical'
    },
    'DySN_1': {
        description: 'Dye set name',
        category: 'dye',
        importance: 'medium'
    },
    'DyeN_1': {
        description: 'Dye 1 name',
        category: 'dye',
        importance: 'low'
    },
    'DyeN_2': {
        description: 'Dye 2 name',
        category: 'dye',
        importance: 'low'
    },
    'DyeN_3': {
        description: 'Dye 3 name',
        category: 'dye',
        importance: 'low'
    },
    'DyeN_4': {
        description: 'Dye 4 name',
        category: 'dye',
        importance: 'low'
    },
    'DyeW_1': {
        description: 'Dye 1 wavelength',
        category: 'dye',
        importance: 'low'
    },
    'DyeW_2': {
        description: 'Dye 2 wavelength',
        category: 'dye',
        importance: 'low'
    },
    'DyeW_3': {
        description: 'Dye 3 wavelength',
        category: 'dye',
        importance: 'low'
    },
    'DyeW_4': {
        description: 'Dye 4 wavelength',
        category: 'dye',
        importance: 'low'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // SAMPLE INFORMATION
    ///////////////////////////////////////////////////////////////////////////
    
    'SMPL_1': {
        description: 'Sample name',
        category: 'sample',
        importance: 'high'
    },
    'CMNT_1': {
        description: 'Sample comment',
        category: 'sample',
        importance: 'medium'
    },
    'TUBE_1': {
        description: 'Well ID',
        category: 'sample',
        importance: 'medium'
    },
    'LANE_1': {
        description: 'Lane number',
        category: 'sample',
        importance: 'medium'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // RUN INFORMATION
    ///////////////////////////////////////////////////////////////////////////
    
    'RunN_1': {
        description: 'Run name',
        category: 'run',
        importance: 'medium'
    },
    'RUND_1': {
        description: 'Run start date',
        category: 'run',
        importance: 'medium'
    },
    'RUND_2': {
        description: 'Run end date',
        category: 'run',
        importance: 'low'
    },
    'RUNT_1': {
        description: 'Run start time',
        category: 'run',
        importance: 'medium'
    },
    'RUNT_2': {
        description: 'Run end time',
        category: 'run',
        importance: 'low'
    },
    'EPVt_1': {
        description: 'Electrophoresis voltage setting',
        category: 'run',
        importance: 'low'
    },
    'Tmpr_1': {
        description: 'Run temperature',
        category: 'run',
        importance: 'low'
    },
    'InSc_1': {
        description: 'Injection time (seconds)',
        category: 'run',
        importance: 'low'
    },
    'InVt_1': {
        description: 'Injection voltage',
        category: 'run',
        importance: 'low'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // INSTRUMENT INFORMATION
    ///////////////////////////////////////////////////////////////////////////
    
    'MCHN_1': {
        description: 'Machine name/serial number',
        category: 'instrument',
        importance: 'medium'
    },
    'MODL_1': {
        description: 'Instrument model',
        category: 'instrument',
        importance: 'medium'
    },
    'HCFG_1': {
        description: 'Hardware configuration (instrument class)',
        category: 'instrument',
        importance: 'low'
    },
    'HCFG_2': {
        description: 'Hardware configuration (instrument family)',
        category: 'instrument',
        importance: 'low'
    },
    'HCFG_3': {
        description: 'Hardware configuration (official instrument name)',
        category: 'instrument',
        importance: 'low'
    },
    'HCFG_4': {
        description: 'Hardware configuration (instrument parameters)',
        category: 'instrument',
        importance: 'low'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // ANALYSIS PARAMETERS
    ///////////////////////////////////////////////////////////////////////////
    
    'SPAC_1': {
        description: 'Average base spacing',
        category: 'analysis',
        importance: 'medium'
    },
    'SPAC_2': {
        description: 'Basecaller spacing estimate',
        category: 'analysis',
        importance: 'low'
    },
    'SPAC_3': {
        description: 'Spacing statistic',
        category: 'analysis',
        importance: 'low'
    },
    'NAVG_1': {
        description: 'Number of averages',
        category: 'analysis',
        importance: 'low'
    },
    'NLNE_1': {
        description: 'Number of capillary lanes',
        category: 'analysis',
        importance: 'low'
    },
    'phAR_1': {
        description: 'Trace peak area ratio',
        category: 'analysis',
        importance: 'low'
    },
    'phCH_1': {
        description: 'Chemistry type',
        category: 'analysis',
        importance: 'low'
    },
    'phDY_1': {
        description: 'Dye mobility file',
        category: 'analysis',
        importance: 'low'
    },
    'phQL_1': {
        description: 'Quality level',
        category: 'analysis',
        importance: 'low'
    },
    'phTR_1': {
        description: 'Trace score',
        category: 'analysis',
        importance: 'low'
    },
    'phTR_2': {
        description: 'Trace quality score',
        category: 'analysis',
        importance: 'low'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // SOFTWARE INFORMATION
    ///////////////////////////////////////////////////////////////////////////
    
    'SVER_1': {
        description: 'Data collection software version',
        category: 'software',
        importance: 'low'
    },
    'SVER_2': {
        description: 'Basecaller version',
        category: 'software',
        importance: 'low'
    },
    'SVER_3': {
        description: 'Software version',
        category: 'software',
        importance: 'low'
    },
    'SVER_4': {
        description: 'Firmware version',
        category: 'software',
        importance: 'low'
    },
    'APrN_1': {
        description: 'Analysis protocol name',
        category: 'software',
        importance: 'low'
    },
    'APrV_1': {
        description: 'Analysis protocol version',
        category: 'software',
        importance: 'low'
    },
    'APrX_1': {
        description: 'Analysis protocol XML string',
        category: 'software',
        importance: 'low'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // SIGNAL PROCESSING
    ///////////////////////////////////////////////////////////////////////////
    
    'S/N%_1': {
        description: 'Signal to noise ratio',
        category: 'signal',
        importance: 'medium'
    },
    'RAWS_1': {
        description: 'Starting raw data point',
        category: 'signal',
        importance: 'low'
    },
    'RAWE_1': {
        description: 'Ending raw data point',
        category: 'signal',
        importance: 'low'
    },
    'RMdX_1': {
        description: 'Reserved',
        category: 'signal',
        importance: 'low'
    },
    'RMdN_1': {
        description: 'Reserved',
        category: 'signal',
        importance: 'low'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // GEL/POLYMER INFORMATION
    ///////////////////////////////////////////////////////////////////////////
    
    'GelN_1': {
        description: 'Gel name/Polymer name',
        category: 'gel',
        importance: 'low'
    },
    'GTEFLT_1': {
        description: 'Gel type',
        category: 'gel',
        importance: 'low'
    },
    'LIMS_1': {
        description: 'LIMS sample ID',
        category: 'gel',
        importance: 'low'
    },
    
    ///////////////////////////////////////////////////////////////////////////
    // SIZING / STANDARDS
    ///////////////////////////////////////////////////////////////////////////
    
    'CTID_1': {
        description: 'Container ID',
        category: 'standard',
        importance: 'low'
    },
    'CtOw_1': {
        description: 'Container owner',
        category: 'standard',
        importance: 'low'
    },
    'CTNM_1': {
        description: 'Container name',
        category: 'standard',
        importance: 'low'
    },
    'OvrI_1': {
        description: 'Overall quality indicator',
        category: 'standard',
        importance: 'low'
    },
    'OvrV_1': {
        description: 'Overall quality value',
        category: 'standard',
        importance: 'low'
    }
};

/**
 * Categories of ABIF tags
 */
const ABIF_TAG_CATEGORIES = {
    trace: 'Trace Data',
    basecall: 'Base Calling',
    quality: 'Quality Scores',
    dye: 'Dye Information',
    sample: 'Sample Information',
    run: 'Run Information',
    instrument: 'Instrument Information',
    analysis: 'Analysis Parameters',
    software: 'Software Information',
    signal: 'Signal Processing',
    gel: 'Gel/Polymer Information',
    standard: 'Standards/Sizing'
};

/**
 * Get information about a specific tag
 * @param {string} tagKey - Tag key (e.g., "DATA_9")
 * @returns {Object|null} Tag information or null if unknown
 */
function getTagInfo(tagKey) {
    return ABIF_TAGS[tagKey] || null;
}

/**
 * Get all tags in a specific category
 * @param {string} category - Category name
 * @returns {Object} Object with tag keys and their info
 */
function getTagsByCategory(category) {
    const result = {};
    for (const [key, info] of Object.entries(ABIF_TAGS)) {
        if (info.category === category) {
            result[key] = info;
        }
    }
    return result;
}

/**
 * Get all critical tags (required for basic functionality)
 * @returns {string[]} Array of critical tag keys
 */
function getCriticalTags() {
    return Object.entries(ABIF_TAGS)
        .filter(([_, info]) => info.importance === 'critical')
        .map(([key, _]) => key);
}

/**
 * Get description for a tag
 * @param {string} tagKey - Tag key (e.g., "DATA_9")
 * @returns {string} Description or "Unknown tag"
 */
function getTagDescription(tagKey) {
    const info = ABIF_TAGS[tagKey];
    return info ? info.description : 'Unknown tag';
}

/**
 * Check if a tag is critical for basic chromatogram display
 * @param {string} tagKey - Tag key
 * @returns {boolean} True if critical
 */
function isTagCritical(tagKey) {
    const info = ABIF_TAGS[tagKey];
    return info ? info.importance === 'critical' : false;
}

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

// For use in Node.js/Electron main process
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ABIF_TAGS,
        ABIF_TAG_CATEGORIES,
        getTagInfo,
        getTagsByCategory,
        getCriticalTags,
        getTagDescription,
        isTagCritical
    };
}

// For use in browser/renderer process
if (typeof window !== 'undefined') {
    window.ABIFTags = {
        ABIF_TAGS,
        ABIF_TAG_CATEGORIES,
        getTagInfo,
        getTagsByCategory,
        getCriticalTags,
        getTagDescription,
        isTagCritical
    };
}

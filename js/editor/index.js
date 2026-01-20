///////////////////////////////////////////////////////////////////////////////
// js/editor/index.js
// Main entry point for editor modules
///////////////////////////////////////////////////////////////////////////////

const { BaseEditor } = require('./BaseEditor.js');
const { EditHistory, ChangeBaseCommand } = require('./EditHistory.js');
const { QualityTrimmer } = require('./QualityTrimmer.js');

module.exports = {
    BaseEditor,
    EditHistory,
    ChangeBaseCommand,
    QualityTrimmer
};

// Also expose to window for browser use
if (typeof window !== 'undefined') {
    window.BaseEditor = BaseEditor;
    window.EditHistory = EditHistory;
    window.ChangeBaseCommand = ChangeBaseCommand;
    window.QualityTrimmer = QualityTrimmer;
}

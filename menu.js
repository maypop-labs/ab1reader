///////////////////////////////////////////////////////////////////////////////
// menu.js ////////////////////////////////////////////////////////////////////

const { app, dialog } = require('electron');

///////////////////////////////////////////////////////////////////////////////
// MODULE /////////////////////////////////////////////////////////////////////

module.exports = {

	create_menu(win) {
		return [
			{
				label: 'File',
				submenu: [

					{
						label: 'Open AB1 File...',
						accelerator: 'CmdOrCtrl+O',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { 
									command: 'menu_open_ab1_file' 
								});
							}
						}
					},

					{ type: 'separator' },

					{
						label: 'Export',
						submenu: [
							{
								label: 'Export as FASTA...',
								enabled: true,
								id: 'export_fasta',
								click() {
									if (win.main) {
										win.main.webContents.send('toRender', { 
											command: 'menu_export_fasta' 
										});
									}
								}
							},
							{
								label: 'Export as FASTQ...',
								enabled: true,
								id: 'export_fastq',
								click() {
									if (win.main) {
										win.main.webContents.send('toRender', { 
											command: 'menu_export_fastq' 
										});
									}
								}
							},
							{
								label: 'Export as PNG...',
								enabled: true,
								id: 'export_png',
								click() {
									if (win.main) {
										win.main.webContents.send('toRender', { 
											command: 'menu_export_png' 
										});
									}
								}
							}
						]
					},

					{ type: 'separator' },

					{ label: 'Exit', click() { app.quit() } }

				]
			},

			{
				label: 'Edit',
				submenu: [
					{
						label: 'Undo',
						accelerator: 'CmdOrCtrl+Z',
						enabled: false,
						id: 'edit_undo',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_undo' });
							}
						}
					},
					{
						label: 'Redo',
						accelerator: 'CmdOrCtrl+Y',
						enabled: false,
						id: 'edit_redo',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_redo' });
							}
						}
					},
					{ type: 'separator' },
					{
						label: 'Copy Sequence',
						accelerator: 'CmdOrCtrl+C',
						enabled: false,
						id: 'edit_copy',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_copy_sequence' });
							}
						}
					}
				]
			},

			{
				label: 'View',
				submenu: [
					{
						label: 'Processed Traces',
						type: 'radio',
						checked: true,
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { 
									command: 'menu_view_mode', 
									mode: 'processed' 
								});
							}
						}
					},
					{
						label: 'Raw Traces',
						type: 'radio',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { 
									command: 'menu_view_mode', 
									mode: 'raw' 
								});
							}
						}
					},
					{
						label: 'Quality Scores',
						type: 'radio',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { 
									command: 'menu_view_mode', 
									mode: 'quality' 
								});
							}
						}
					},
					{ type: 'separator' },
					{
						label: 'Zoom In',
						accelerator: 'CmdOrCtrl+Plus',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_zoom_in' });
							}
						}
					},
					{
						label: 'Zoom Out',
						accelerator: 'CmdOrCtrl+-',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_zoom_out' });
							}
						}
					},
					{
						label: 'Fit to Window',
						accelerator: 'CmdOrCtrl+0',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_zoom_fit' });
							}
						}
					}
				]
			},

			{
				label: 'Analysis',
				submenu: [
					{
						label: 'Quality Trim...',
						enabled: true,
						id: 'analysis_trim',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_quality_trim' });
							}
						}
					},
					{
						label: 'Reverse Complement',
						enabled: false,
						id: 'analysis_revcomp',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_reverse_complement' });
							}
						}
					},
					{ type: 'separator' },
					{
						label: 'Show Statistics',
						enabled: false,
						id: 'analysis_stats',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'menu_show_stats' });
							}
						}
					}
				]
			},

			{
				label: 'Debug',
				submenu: [
					{ 
						label: 'Developer Console', 
						accelerator: 'F12',
						click() { 
							win.main.webContents.openDevTools({ mode: 'detach' }) 
						} 
					},
					{ type: 'separator' },
					{
						label: 'Show All Tags',
						click() {
							if (win.main) {
								win.main.webContents.send('toRender', { command: 'debug_show_tags' });
							}
						}
					}
				]
			}
		]
	}

}

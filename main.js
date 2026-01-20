///////////////////////////////////////////////////////////////////////////////
// main.js

///////////////////////////////////////////////////////////////////////////////
// REQUIRED COMPONENTS ////////////////////////////////////////////////////////

// core application components
const { app, BrowserWindow, Menu, dialog } = require('electron');
const app_menu = require ('./menu.js');

// ABIF Parser
const ABIFParser = require('./js/abif/ABIFParser.js');
const child_process = require('child_process');
const chokidar = require('chokidar');
const eStore = require('electron-store');
const ipc = require('electron').ipcMain;
const path = require('path');

///////////////////////////////////////////////////////////////////////////////
// GLOBAL VARIABLES ///////////////////////////////////////////////////////////

// core global variables
const store = new eStore();
const spawns = [];
const fileWatchers = []; // Array to track active file watchers
const win = { main: null, icon: 'assets/icons/icon.png' };

// application-specific global variables
const project = { };

///////////////////////////////////////////////////////////////////////////////
// LOAD THE DEFAULT SETTINGS //////////////////////////////////////////////////

const os = require('os');
const fs = require('fs');

let app_storage = {};
app_storage.project_directory = store.get('projectDirectory');
app_storage.window_bounds = store.get('windowBounds');
app_storage.interpreters = store.get('interpreters');

if (typeof (app_storage.project_directory) === 'undefined') { app_storage.project_directory = ''; }
if (typeof (app_storage.window_bounds) === 'undefined') { app_storage.window_bounds = {}; }
if (typeof (app_storage.window_bounds.height) === 'undefined') { app_storage.window_bounds.height = 800; }
if (typeof (app_storage.window_bounds.maximized) === 'undefined') { app_storage.window_bounds.maximized = false; }
if (typeof (app_storage.window_bounds.width) === 'undefined') { app_storage.window_bounds.width = 1000; }

// Initialize interpreter paths with platform-specific defaults
if (typeof (app_storage.interpreters) === 'undefined') {
	app_storage.interpreters = get_default_interpreter_paths();
	store.set('interpreters', app_storage.interpreters);
}

///////////////////////////////////////////////////////////////////////////////
// MENU ///////////////////////////////////////////////////////////////////////

const menu = Menu.buildFromTemplate(app_menu.create_menu(win));
Menu.setApplicationMenu(menu);

///////////////////////////////////////////////////////////////////////////////
// APPLICATION CONTROL ////////////////////////////////////////////////////////

app.whenReady().then(show_window);
app.once('before-quit', () => { window.removeAllListeners('close'); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { show_window(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') { app.quit() } });

///////////////////////////////////////////////////////////////////////////////
// FUNCTIONS //////////////////////////////////////////////////////////////////

async function initialize() {

}

function show_window(filename) {
	if (typeof (filename) === 'undefined') { filename = 'render.html'; }
	const file_path = path.join(__dirname, filename);
	if (!win.main) {
		win.main = new BrowserWindow({
			frame: true,
			height: app_storage.window_bounds.height,
			icon: win.icon,
			show: false,
			webPreferences: {
				contextIsolation: true,
				enableRemoteModule: false,
				nodeIntegration: false,
				preload: path.join(__dirname, 'preload.js')
			},
			width: app_storage.window_bounds.width
		});
		if (app_storage.window_bounds.maximized) { win.main.maximize(); }
		if (app_storage.window_bounds.x && app_storage.window_bounds.y) { win.main.setPosition(app_storage.window_bounds.x, app_storage.window_bounds.y); }
		win.main.loadFile(file_path);
		win.main.on('close', () => {
			ipc.removeAllListeners();
			const position = win.main.getPosition();
			store.set('projectDirectory', app_storage.project_directory);
			store.set('windowBounds.height', app_storage.window_bounds.height);
			store.set('windowBounds.maximized', app_storage.window_bounds.maximized);
			store.set('windowBounds.width', app_storage.window_bounds.width);
			store.set('windowBounds.x', position[0]);
			store.set('windowBounds.y', position[1]);
		});
		win.main.on('maximize', () => {
			app_storage.window_bounds.maximized = true;
			win.main.webContents.send('window-resized', win.main.getBounds());
		});
		win.main.on('resize', () => {
			if (!win.main.isMaximized()) {
				let { height, width } = win.main.getBounds();
				app_storage.window_bounds.height = height;
				app_storage.window_bounds.width = width;
				win.main.webContents.send('window-resized', win.main.getBounds());
				win.main.webContents.send('toRender', { command: 'window_resized' });
			}
		});
		win.main.on('unmaximize', () => {
			app_storage.window_bounds.maximized = false;
			win.main.setSize(app_storage.window_bounds.width, app_storage.window_bounds.height)
		});
	}
	win.main.once('ready-to-show', () => {
		win.main.show();
		win.main.webContents.send('toRender', { command: 'initialize' });
		initialize();
	});
}

///////////////////////////////////////////////////////////////////////////////
// OBJECTS ////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// FILE WATCHER CLASS /////////////////////////////////////////////////////////

function FileWatcher() {
	this.id = '';
	this.watcher = null;
	this.filepath = '';
	this.callback = null;
	this.timeoutHandle = null;
	this.completed = false;
	this.startTime = null;

	this.watch_for_file = (filepath, callback, timeout) => {
		this.id = Math.random().toString(36).substring(7);
		this.filepath = filepath;
		this.callback = callback;
		this.startTime = Date.now();
		this.completed = false;

		// Check if file already exists
		if (fs.existsSync(filepath)) {
			this.completed = true;
			if (this.callback) {
				this.callback({
					success: true,
					filepath: filepath,
					event: 'exists',
					id: this.id
				});
			}
			return this.id;
		}

		// Watch for file creation
		const watchDir = path.dirname(filepath);
		const filename = path.basename(filepath);

		try {
			this.watcher = chokidar.watch(watchDir, {
				persistent: true,
				ignoreInitial: false,
				awaitWriteFinish: {
					stabilityThreshold: 500,
					pollInterval: 100
				}
			});

			this.watcher.on('add', (detectedPath) => {
				if (path.basename(detectedPath) === filename && !this.completed) {
					this.completed = true;
					this.cleanup();
					if (this.callback) {
						this.callback({
							success: true,
							filepath: filepath,
							event: 'created',
							id: this.id
						});
					}
				}
			});

			this.watcher.on('change', (detectedPath) => {
				if (path.basename(detectedPath) === filename && !this.completed) {
					this.completed = true;
					this.cleanup();
					if (this.callback) {
						this.callback({
							success: true,
							filepath: filepath,
							event: 'modified',
							id: this.id
						});
					}
				}
			});

			this.watcher.on('error', (error) => {
				console.error(`FileWatcher [${this.id}] error:`, error);
				if (!this.completed && this.callback) {
					this.callback({
						success: false,
						filepath: filepath,
						event: 'error',
						error: error.message,
						id: this.id
					});
				}
				this.cleanup();
			});

			// Set timeout if specified
			if (timeout && timeout > 0) {
				this.timeoutHandle = setTimeout(() => {
					if (!this.completed) {
						this.completed = true;
						this.cleanup();
						if (this.callback) {
							this.callback({
								success: false,
								filepath: filepath,
								event: 'timeout',
								error: `File watch timed out after ${timeout}ms`,
								id: this.id
							});
						}
					}
				}, timeout);
			}

			return this.id;

		} catch (error) {
			console.error('Failed to create file watcher:', error);
			if (this.callback) {
				this.callback({
					success: false,
					filepath: filepath,
					event: 'error',
					error: error.message,
					id: this.id
				});
			}
			return null;
		}
	}

	this.watch_directory = (dirpath, pattern, callback, timeout) => {
		this.id = Math.random().toString(36).substring(7);
		this.filepath = dirpath;
		this.callback = callback;
		this.startTime = Date.now();
		this.completed = false;

		const matchesPattern = (filename) => {
			if (!pattern) return true;
			if (typeof pattern === 'string') {
				return filename.includes(pattern);
			}
			if (pattern instanceof RegExp) {
				return pattern.test(filename);
			}
			return false;
		};

		try {
			this.watcher = chokidar.watch(dirpath, {
				persistent: true,
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 500,
					pollInterval: 100
				}
			});

			this.watcher.on('add', (detectedPath) => {
				const filename = path.basename(detectedPath);
				if (matchesPattern(filename) && !this.completed) {
					this.completed = true;
					this.cleanup();
					if (this.callback) {
						this.callback({
							success: true,
							filepath: detectedPath,
							dirpath: dirpath,
							filename: filename,
							event: 'created',
							id: this.id
						});
					}
				}
			});

			this.watcher.on('error', (error) => {
				console.error(`FileWatcher [${this.id}] error:`, error);
				if (!this.completed && this.callback) {
					this.callback({
						success: false,
						dirpath: dirpath,
						event: 'error',
						error: error.message,
						id: this.id
					});
				}
				this.cleanup();
			});

			// Set timeout if specified
			if (timeout && timeout > 0) {
				this.timeoutHandle = setTimeout(() => {
					if (!this.completed) {
						this.completed = true;
						this.cleanup();
						if (this.callback) {
							this.callback({
								success: false,
								dirpath: dirpath,
								event: 'timeout',
								error: `Directory watch timed out after ${timeout}ms`,
								id: this.id
							});
						}
					}
				}, timeout);
			}

			return this.id;

		} catch (error) {
			console.error('Failed to create directory watcher:', error);
			if (this.callback) {
				this.callback({
					success: false,
					dirpath: dirpath,
					event: 'error',
					error: error.message,
					id: this.id
				});
			}
			return null;
		}
	}

	this.cleanup = () => {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
			this.timeoutHandle = null;
		}
		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}
	}

	this.stop = () => {
		this.completed = true;
		this.cleanup();
	}
}

///////////////////////////////////////////////////////////////////////////////
// SPAWN CLASS ////////////////////////////////////////////////////////////////

function SPAWN() {
	this.handle = undefined;
	this.id = '';
	this.status = 'IDLE'; // IDLE, RUNNING, COMPLETED, FAILED, TIMEOUT
	this.exitCode = null;
	this.startTime = null;
	this.endTime = null;
	this.timeoutHandle = null;
	this.completionCallback = null;

	this.create = (cmd, args, options) => {
		if (!cmd) { cmd = 'cmd'; }
		if (!args) { args = []; }
		if (!options) { options = {}; }
		
		// Set defaults
		const spawnOptions = {
			shell: options.shell !== undefined ? options.shell : true,
			cwd: options.cwd || process.cwd(),
			env: options.env || process.env
		};
		
		const timeout = options.timeout || 0; // 0 = no timeout
		this.completionCallback = options.onComplete || null;
		
		try {
			this.handle = child_process.spawn(cmd, args, spawnOptions);
			this.id = Math.random().toString(36).substring(7);
			this.status = 'RUNNING';
			this.startTime = Date.now();

			// Set up timeout if specified
			if (timeout > 0) {
				this.timeoutHandle = setTimeout(() => {
					this.status = 'TIMEOUT';
					this.kill();
					win.main.webContents.send('fromSpawn', {
						id: this.id,
						data: `Process timed out after ${timeout}ms`,
						success: false,
						type: 'timeout'
					});
				}, timeout);
			}

			this.handle.stdout.setEncoding('utf8');
			this.handle.stderr.setEncoding('utf8');
			
			this.handle.stdout.on('data', (data) => {
				win.main.webContents.send('fromSpawn', {
					id: this.id,
					data: data,
					success: true,
					type: 'stdout'
				});
			});

			this.handle.stderr.on('data', (data) => {
				win.main.webContents.send('fromSpawn', {
					id: this.id,
					data: data,
					success: false,
					type: 'stderr'
				});
			});

			this.handle.on('error', (error) => {
				this.status = 'FAILED';
				this.endTime = Date.now();
				console.error(`Spawn error [${this.id}]:`, error);
				win.main.webContents.send('fromSpawn', {
					id: this.id,
					data: error.message,
					success: false,
					type: 'error',
					error: error
				});
			});
			
			this.handle.on('close', (code) => {
				this.exitCode = code;
				this.endTime = Date.now();
				
				// Clear timeout if it exists
				if (this.timeoutHandle) {
					clearTimeout(this.timeoutHandle);
					this.timeoutHandle = null;
				}
				
				// Update status if not already set (e.g., by timeout)
				if (this.status === 'RUNNING') {
					this.status = (code === 0) ? 'COMPLETED' : 'FAILED';
				}
				
				const duration = this.endTime - this.startTime;
				
				// Send completion notification
				win.main.webContents.send('fromSpawn', {
					id: this.id,
					data: `Process exited with code ${code}`,
					success: code === 0,
					type: 'close',
					exitCode: code,
					status: this.status,
					duration: duration
				});
				
				// Call completion callback if provided
				if (this.completionCallback) {
					this.completionCallback({
						id: this.id,
						exitCode: code,
						status: this.status,
						duration: duration,
						success: code === 0
					});
				}
				
				this.handle = undefined;
			});

			return this.id;
			
		} catch (error) {
			this.status = 'FAILED';
			console.error('Failed to create spawn:', error);
			win.main.webContents.send('fromSpawn', {
				id: this.id,
				data: `Failed to create process: ${error.message}`,
				success: false,
				type: 'creation_error',
				error: error
			});
			return null;
		}
	}

	this.kill = () => {
		if (this.handle) {
			this.handle.stdin.pause();
			this.handle.kill();
		}
	}

	this.write = (cmd) => {
		if (this.handle && this.handle.stdin.writable) {
			if (!cmd.includes('\n')) { cmd += '\n'; }
			this.handle.stdin.cork();
			this.handle.stdin.write(cmd);
			this.handle.stdin.uncork();
			return true;
		}
		return false;
	}

	this.getStatus = () => {
		return {
			id: this.id,
			status: this.status,
			exitCode: this.exitCode,
			startTime: this.startTime,
			endTime: this.endTime,
			duration: this.endTime ? (this.endTime - this.startTime) : (Date.now() - this.startTime)
		};
	}

}

///////////////////////////////////////////////////////////////////////////////
// FUNCTIONS //////////////////////////////////////////////////////////////////

// Configuration constants
const MAX_CONCURRENT_PROCESSES = 10;

///////////////////////////////////////////////////////////////////////////////
// INTERPRETER CONFIGURATION //////////////////////////////////////////////////

function get_default_interpreter_paths() {
	const platform = os.platform();
	const defaults = {
		python: '',
		r: '',
		perl: '',
		node: process.execPath // Node.js path is always available
	};

	// Platform-specific default paths
	if (platform === 'win32') {
		// Windows paths
		const commonPaths = {
			python: [
				'C:\\Python312\\python.exe',
				'C:\\Python311\\python.exe',
				'C:\\Python310\\python.exe',
				'C:\\Python39\\python.exe',
				'C:\\Program Files\\Python312\\python.exe',
				'C:\\Program Files\\Python311\\python.exe',
				'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
				'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Programs\\Python\\Python311\\python.exe'
			],
			r: [
				'C:\\Program Files\\R\\R-4.3.2\\bin\\Rscript.exe',
				'C:\\Program Files\\R\\R-4.3.1\\bin\\Rscript.exe',
				'C:\\Program Files\\R\\R-4.2.3\\bin\\Rscript.exe',
				'C:\\Program Files\\R\\R-4.2.2\\bin\\Rscript.exe',
				'C:\\Program Files\\R\\R-4.1.3\\bin\\Rscript.exe'
			],
			perl: [
				'C:\\Strawberry\\perl\\bin\\perl.exe',
				'C:\\Perl64\\bin\\perl.exe',
				'C:\\Perl\\bin\\perl.exe'
			]
		};
		
		// Find first existing path for each interpreter
		for (const lang in commonPaths) {
			for (const p of commonPaths[lang]) {
				if (fs.existsSync(p)) {
					defaults[lang] = p;
					break;
				}
			}
		}
	} else {
		// Unix-like systems (Linux, macOS)
		const commonPaths = {
			python: [
				'/usr/bin/python3',
				'/usr/local/bin/python3',
				'/opt/homebrew/bin/python3',
				'/usr/bin/python',
				'/usr/local/bin/python'
			],
			r: [
				'/usr/bin/Rscript',
				'/usr/local/bin/Rscript',
				'/opt/homebrew/bin/Rscript'
			],
			perl: [
				'/usr/bin/perl',
				'/usr/local/bin/perl',
				'/opt/homebrew/bin/perl'
			]
		};
		
		// Find first existing path for each interpreter
		for (const lang in commonPaths) {
			for (const p of commonPaths[lang]) {
				if (fs.existsSync(p)) {
					defaults[lang] = p;
					break;
				}
			}
		}
	}

	return defaults;
}

function validate_interpreter_path(path) {
	if (!path || path === '') {
		return { valid: false, error: 'Path is empty' };
	}
	try {
		if (!fs.existsSync(path)) {
			return { valid: false, error: 'File does not exist' };
		}
		const stats = fs.statSync(path);
		if (!stats.isFile()) {
			return { valid: false, error: 'Path is not a file' };
		}
		// On Unix systems, check if executable
		if (os.platform() !== 'win32') {
			try {
				fs.accessSync(path, fs.constants.X_OK);
			} catch (e) {
				return { valid: false, error: 'File is not executable' };
			}
		}
		return { valid: true };
	} catch (error) {
		return { valid: false, error: error.message };
	}
}

function get_interpreter_path(language) {
	const lang = language.toLowerCase();
	if (app_storage.interpreters[lang]) {
		return app_storage.interpreters[lang];
	}
	return null;
}

function set_interpreter_path(language, path) {
	const validation = validate_interpreter_path(path);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}
	const lang = language.toLowerCase();
	app_storage.interpreters[lang] = path;
	store.set('interpreters', app_storage.interpreters);
	return { success: true };
}

///////////////////////////////////////////////////////////////////////////////
// LANGUAGE-SPECIFIC EXECUTION ////////////////////////////////////////////////

function execute_python(script_path, args, options) {
	const python_path = get_interpreter_path('python');
	if (!python_path) {
		return { success: false, error: 'Python interpreter not configured' };
	}
	
	const validation = validate_interpreter_path(python_path);
	if (!validation.valid) {
		return { success: false, error: `Python interpreter invalid: ${validation.error}` };
	}
	
	if (!fs.existsSync(script_path)) {
		return { success: false, error: `Script not found: ${script_path}` };
	}
	
	// Build argument array
	const script_args = [script_path];
	if (args && Array.isArray(args)) {
		script_args.push(...args);
	}
	
	// Merge default options
	const spawn_options = Object.assign({
		shell: false,
		cwd: path.dirname(script_path)
	}, options || {});
	
	const id = create_spawn(python_path, script_args, spawn_options);
	return { success: !!id, id: id };
}

function execute_r(script_path, args, options) {
	const r_path = get_interpreter_path('r');
	if (!r_path) {
		return { success: false, error: 'R interpreter not configured' };
	}
	
	const validation = validate_interpreter_path(r_path);
	if (!validation.valid) {
		return { success: false, error: `R interpreter invalid: ${validation.error}` };
	}
	
	if (!fs.existsSync(script_path)) {
		return { success: false, error: `Script not found: ${script_path}` };
	}
	
	// Build argument array
	const script_args = [script_path];
	if (args && Array.isArray(args)) {
		script_args.push(...args);
	}
	
	// Merge default options
	const spawn_options = Object.assign({
		shell: false,
		cwd: path.dirname(script_path)
	}, options || {});
	
	const id = create_spawn(r_path, script_args, spawn_options);
	return { success: !!id, id: id };
}

function execute_perl(script_path, args, options) {
	const perl_path = get_interpreter_path('perl');
	if (!perl_path) {
		return { success: false, error: 'Perl interpreter not configured' };
	}
	
	const validation = validate_interpreter_path(perl_path);
	if (!validation.valid) {
		return { success: false, error: `Perl interpreter invalid: ${validation.error}` };
	}
	
	if (!fs.existsSync(script_path)) {
		return { success: false, error: `Script not found: ${script_path}` };
	}
	
	// Build argument array
	const script_args = [script_path];
	if (args && Array.isArray(args)) {
		script_args.push(...args);
	}
	
	// Merge default options
	const spawn_options = Object.assign({
		shell: false,
		cwd: path.dirname(script_path)
	}, options || {});
	
	const id = create_spawn(perl_path, script_args, spawn_options);
	return { success: !!id, id: id };
}

function execute_node(script_path, args, options) {
	const node_path = get_interpreter_path('node');
	if (!node_path) {
		return { success: false, error: 'Node.js interpreter not configured' };
	}
	
	if (!fs.existsSync(script_path)) {
		return { success: false, error: `Script not found: ${script_path}` };
	}
	
	// Build argument array
	const script_args = [script_path];
	if (args && Array.isArray(args)) {
		script_args.push(...args);
	}
	
	// Merge default options
	const spawn_options = Object.assign({
		shell: false,
		cwd: path.dirname(script_path)
	}, options || {});
	
	const id = create_spawn(node_path, script_args, spawn_options);
	return { success: !!id, id: id };
}

function execute_cpp(executable_path, args, options) {
	// For C++, we execute the compiled binary directly
	if (!fs.existsSync(executable_path)) {
		return { success: false, error: `Executable not found: ${executable_path}` };
	}
	
	const stats = fs.statSync(executable_path);
	if (!stats.isFile()) {
		return { success: false, error: 'Path is not a file' };
	}
	
	// Build argument array
	const exec_args = args && Array.isArray(args) ? args : [];
	
	// Merge default options
	const spawn_options = Object.assign({
		shell: false,
		cwd: path.dirname(executable_path)
	}, options || {});
	
	const id = create_spawn(executable_path, exec_args, spawn_options);
	return { success: !!id, id: id };
}

function execute_generic(command, args, options) {
	// Generic execution for any command
	const exec_args = args && Array.isArray(args) ? args : [];
	const spawn_options = options || {};
	
	const id = create_spawn(command, exec_args, spawn_options);
	return { success: !!id, id: id };
}

///////////////////////////////////////////////////////////////////////////////
// PROCESS MANAGEMENT /////////////////////////////////////////////////////////

function create_spawn(cmd, args, options) {
	if (!cmd) { cmd = 'cmd'; }
	if (!args) { args = []; }
	if (!options) { options = {}; }
	
	// Check concurrent process limit
	const runningCount = spawns.filter(s => s.status === 'RUNNING').length;
	if (runningCount >= MAX_CONCURRENT_PROCESSES) {
		console.error(`Cannot create spawn: maximum concurrent processes (${MAX_CONCURRENT_PROCESSES}) reached`);
		return null;
	}
	
	const spawn = new SPAWN();
	const id = spawn.create(cmd, args, options);
	
	if (id) {
		spawns.push(spawn);
		
		// Auto-cleanup completed processes after 30 seconds
		if (!options.keepAlive) {
			setTimeout(() => {
				if (spawn.status !== 'RUNNING') {
					remove_spawn_by_id(id);
				}
			}, 30000);
		}
	}
	
	return id;
}

function get_spawn_by_id(id) {
	const filtered = spawns.filter(s => s.id === id);
	return filtered.length > 0 ? filtered[0] : null;
}

function remove_spawn_by_id(id) {
	const index = spawns.findIndex(s => s.id === id);
	if (index !== -1) {
		spawns.splice(index, 1);
		return true;
	}
	return false;
}

function cleanup_completed_spawns() {
	const toRemove = [];
	for (let i = 0; i < spawns.length; i++) {
		const spawn = spawns[i];
		if (spawn.status === 'COMPLETED' || spawn.status === 'FAILED' || spawn.status === 'TIMEOUT') {
			toRemove.push(spawn.id);
		}
	}
	toRemove.forEach(id => remove_spawn_by_id(id));
	return toRemove.length;
}

function get_all_spawn_statuses() {
	return spawns.map(s => s.getStatus());
}

///////////////////////////////////////////////////////////////////////////////
// FILE WATCHER MANAGEMENT ////////////////////////////////////////////////////

function create_file_watcher(filepath, callback, timeout) {
	const watcher = new FileWatcher();
	const id = watcher.watch_for_file(filepath, callback, timeout);
	
	if (id) {
		fileWatchers.push(watcher);
		
		// Auto-cleanup after completion
		const originalCallback = callback;
		watcher.callback = (result) => {
			if (originalCallback) {
				originalCallback(result);
			}
			// Remove from array after callback completes
			setTimeout(() => {
				remove_file_watcher_by_id(id);
			}, 1000);
		};
	}
	
	return id;
}

function create_directory_watcher(dirpath, pattern, callback, timeout) {
	const watcher = new FileWatcher();
	const id = watcher.watch_directory(dirpath, pattern, callback, timeout);
	
	if (id) {
		fileWatchers.push(watcher);
		
		// Auto-cleanup after completion
		const originalCallback = callback;
		watcher.callback = (result) => {
			if (originalCallback) {
				originalCallback(result);
			}
			// Remove from array after callback completes
			setTimeout(() => {
				remove_file_watcher_by_id(id);
			}, 1000);
		};
	}
	
	return id;
}

function get_file_watcher_by_id(id) {
	const filtered = fileWatchers.filter(w => w.id === id);
	return filtered.length > 0 ? filtered[0] : null;
}

function remove_file_watcher_by_id(id) {
	const index = fileWatchers.findIndex(w => w.id === id);
	if (index !== -1) {
		const watcher = fileWatchers[index];
		watcher.stop();
		fileWatchers.splice(index, 1);
		return true;
	}
	return false;
}

function cleanup_file_watchers() {
	const toRemove = [];
	for (let i = 0; i < fileWatchers.length; i++) {
		const watcher = fileWatchers[i];
		if (watcher.completed) {
			toRemove.push(watcher.id);
		}
	}
	toRemove.forEach(id => remove_file_watcher_by_id(id));
	return toRemove.length;
}

///////////////////////////////////////////////////////////////////////////////
// OUTPUT FILE READING ////////////////////////////////////////////////////////

function read_output_file(filepath, format, options) {
	options = options || {};
	const maxRetries = options.maxRetries || 3;
	const retryDelay = options.retryDelay || 1000;
	const deleteAfterRead = options.deleteAfterRead || false;

	// Auto-detect format if not provided
	if (!format) {
		const ext = path.extname(filepath).toLowerCase();
		const formatMap = {
			'.json': 'json',
			'.csv': 'csv',
			'.txt': 'txt',
			'.log': 'txt',
			'.xlsx': 'xlsx',
			'.xls': 'xlsx'
		};
		format = formatMap[ext] || 'binary';
	}

	const attemptRead = (retriesLeft) => {
		return new Promise((resolve, reject) => {
			if (!fs.existsSync(filepath)) {
				return reject(new Error(`File not found: ${filepath}`));
			}

			try {
				let result = null;

				switch (format.toLowerCase()) {
					case 'json': {
						const jsonContent = fs.readFileSync(filepath, 'utf8');
						result = {
							format: 'json',
							data: JSON.parse(jsonContent),
							rawContent: jsonContent
						};
						break;
					}

					case 'csv': {
						const XLSX = require('xlsx');
						const workbook = XLSX.readFile(filepath, { type: 'file' });
						const sheetName = workbook.SheetNames[0];
						const worksheet = workbook.Sheets[sheetName];
						const data = XLSX.utils.sheet_to_json(worksheet);
						result = {
							format: 'csv',
							data: data,
							rows: data.length,
							columns: data.length > 0 ? Object.keys(data[0]) : []
						};
						break;
					}

					case 'txt': {
						const txtContent = fs.readFileSync(filepath, 'utf8');
						result = {
							format: 'txt',
							data: txtContent,
							lineCount: txtContent.split('\n').length
						};
						break;
					}

					case 'xlsx': {
						const XLSX = require('xlsx');
						const workbook = XLSX.readFile(filepath);
						const sheets = {};
						workbook.SheetNames.forEach(sheetName => {
							const worksheet = workbook.Sheets[sheetName];
							sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet);
						});
						result = {
							format: 'xlsx',
							data: sheets,
							sheetNames: workbook.SheetNames,
							sheetCount: workbook.SheetNames.length
						};
						break;
					}

					case 'binary': {
						const buffer = fs.readFileSync(filepath);
						result = {
							format: 'binary',
							data: buffer,
							base64: buffer.toString('base64'),
							size: buffer.length
						};
						break;
					}

					default: {
						return reject(new Error(`Unsupported format: ${format}`));
					}
				}

				// Add metadata
				const stats = fs.statSync(filepath);
				result.filepath = filepath;
				result.filename = path.basename(filepath);
				result.size = stats.size;
				result.modified = stats.mtime;
				result.created = stats.birthtime;

				// Delete file if requested
				if (deleteAfterRead) {
					try {
						fs.unlinkSync(filepath);
						result.deleted = true;
					} catch (deleteError) {
						console.warn(`Failed to delete file after reading: ${deleteError.message}`);
						result.deleted = false;
					}
				}

				resolve(result);

			} catch (error) {
				// Check if it's a file lock/access error and we have retries left
				if (retriesLeft > 0 && (error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES')) {
					console.log(`File locked or busy, retrying in ${retryDelay}ms... (${retriesLeft} retries left)`);
					setTimeout(() => {
						attemptRead(retriesLeft - 1).then(resolve).catch(reject);
					}, retryDelay);
				} else {
					reject(error);
				}
			}
		});
	};

	return attemptRead(maxRetries);
}

function read_multiple_output_files(filepaths, options) {
	options = options || {};
	const format = options.format || null; // null = auto-detect for each
	const deleteAfterRead = options.deleteAfterRead || false;
	const continueOnError = options.continueOnError !== undefined ? options.continueOnError : true;

	const results = [];
	const errors = [];

	return new Promise((resolve, reject) => {
		const readPromises = filepaths.map((filepath, index) => {
			return read_output_file(filepath, format, { deleteAfterRead: deleteAfterRead })
				.then(result => {
					results[index] = { success: true, ...result };
				})
				.catch(error => {
					errors[index] = { 
						success: false, 
						filepath: filepath, 
						error: error.message 
					};
					if (!continueOnError) {
						throw error;
					}
				});
		});

		Promise.allSettled(readPromises)
			.then(() => {
				// Merge results and errors
				const combined = filepaths.map((filepath, index) => {
					return results[index] || errors[index] || { 
						success: false, 
						filepath: filepath, 
						error: 'Unknown error' 
					};
				});

				const successCount = combined.filter(r => r.success).length;
				const errorCount = combined.filter(r => !r.success).length;

				resolve({
					results: combined,
					successCount: successCount,
					errorCount: errorCount,
					totalCount: filepaths.length
				});
			})
			.catch(error => {
				reject(error);
			});
	});
}

///////////////////////////////////////////////////////////////////////////////
// INTEGRATED SCRIPT EXECUTION WITH OUTPUT CAPTURE ////////////////////////////

function execute_script_with_output_capture(language, script_path, args, options) {
	// Extract watch_files from options
	const watch_files = options.watch_files || [];
	const cleanup_outputs = options.cleanup_outputs !== undefined ? options.cleanup_outputs : false;
	const read_timeout = options.read_timeout || 5000; // 5 second delay before reading

	// Store original completion callback
	const originalCallback = options.onComplete;

	// Create new completion callback that reads output files
	options.onComplete = async (scriptResult) => {
		// Wait a bit for files to be fully written
		await new Promise(resolve => setTimeout(resolve, read_timeout));

		// Read all watched output files
		const outputResults = {};
		const outputErrors = [];

		for (const watchFile of watch_files) {
			try {
				const result = await read_output_file_with_retry(
					watchFile.filepath || watchFile,
					watchFile.format || null,
					3,
					1000
				);

				if (result.success) {
					outputResults[watchFile.filepath || watchFile] = result;

					// Cleanup if requested
					if (cleanup_outputs) {
						try {
							fs.unlinkSync(watchFile.filepath || watchFile);
						} catch (cleanupError) {
							console.error('Error cleaning up output file:', cleanupError);
						}
					}
				} else {
					outputErrors.push({
						filepath: watchFile.filepath || watchFile,
						error: result.error
					});
				}
			} catch (error) {
				outputErrors.push({
					filepath: watchFile.filepath || watchFile,
					error: error.message
				});
			}
		}

		// Combine script result with output data
		const combinedResult = {
			...scriptResult,
			outputs: outputResults,
			outputErrors: outputErrors.length > 0 ? outputErrors : undefined,
			filesRead: Object.keys(outputResults).length,
			filesExpected: watch_files.length
		};

		// Send combined result to renderer
		win.main.webContents.send('fromScriptExecution', {
			command: 'script_completed_with_outputs',
			...combinedResult
		});

		// Call original callback if provided
		if (originalCallback) {
			originalCallback(combinedResult);
		}
	};

	// Execute the script with modified options
	let result;
	switch (language.toLowerCase()) {
		case 'python':
			result = execute_python(script_path, args, options);
			break;
		case 'r':
			result = execute_r(script_path, args, options);
			break;
		case 'perl':
			result = execute_perl(script_path, args, options);
			break;
		case 'node':
		case 'nodejs':
		case 'javascript':
			result = execute_node(script_path, args, options);
			break;
		case 'cpp':
		case 'c++':
			result = execute_cpp(script_path, args, options);
			break;
		case 'generic':
			result = execute_generic(script_path, args, options);
			break;
		default:
			return {
				success: false,
				error: `Unsupported language: ${language}`
			};
	}

	return result;
}

///////////////////////////////////////////////////////////////////////////////
// VALIDATION FUNCTIONS (PHASE 5) ////////////////////////////////////////////

function validate_output_path(filepath) {
	if (!filepath) {
		return { valid: false, error: 'Filepath is empty' };
	}

	try {
		const dirpath = path.dirname(filepath);
		
		// Check if directory exists
		if (!fs.existsSync(dirpath)) {
			return { valid: false, error: `Directory does not exist: ${dirpath}` };
		}
		
		// Check if directory is writable (try to create a temp file)
		try {
			const testFile = path.join(dirpath, `.write_test_${Date.now()}`);
			fs.writeFileSync(testFile, 'test');
			fs.unlinkSync(testFile);
			return { valid: true };
		} catch (writeError) {
			return { valid: false, error: `Directory is not writable: ${dirpath}` };
		}
	} catch (error) {
		return { valid: false, error: error.message };
	}
}

function validate_script_execution_params(language, script_path, options) {
	const errors = [];
	
	// Validate language
	const supported_languages = ['python', 'r', 'perl', 'node', 'nodejs', 'javascript', 'cpp', 'c++', 'generic'];
	if (!language || !supported_languages.includes(language.toLowerCase())) {
		errors.push(`Unsupported or missing language: ${language}`);
	}
	
	// Validate script path
	if (!script_path) {
		errors.push('Script path is required');
	} else if (!fs.existsSync(script_path)) {
		errors.push(`Script not found: ${script_path}`);
	}
	
	// Validate interpreter (except for generic and C++)
	const lang = language ? language.toLowerCase() : '';
	if (lang !== 'generic' && lang !== 'cpp' && lang !== 'c++') {
		const interpreter_path = get_interpreter_path(lang === 'nodejs' || lang === 'javascript' ? 'node' : lang);
		if (!interpreter_path) {
			errors.push(`${language} interpreter not configured`);
		} else {
			const validation = validate_interpreter_path(interpreter_path);
			if (!validation.valid) {
				errors.push(`${language} interpreter invalid: ${validation.error}`);
			}
		}
	}
	
	// Validate output file paths if watch_files specified
	if (options && options.watch_files && Array.isArray(options.watch_files)) {
		for (const watchFile of options.watch_files) {
			const filepath = watchFile.filepath || watchFile;
			const validation = validate_output_path(filepath);
			if (!validation.valid) {
				errors.push(`Output file path invalid: ${validation.error}`);
			}
		}
	}
	
	return {
		valid: errors.length === 0,
		errors: errors.length > 0 ? errors : undefined
	};
}

function update_menu_item(item, state) {
	if (item) {
		const menu_item = menu.getMenuItemById(item);
		if (state) {
			switch (state) {
				case 'disable': { menu_item.enabled = false; break; }
				case 'enable': { menu_item.enabled = true; break; }
			}
		}
	}
	return true;
}

function update_menu_item_batch(batch, state) {
	if (batch && state) {
		for (let i = 0; i < batch.length; i++) {
			let menu_item = menu.getMenuItemById(arg.batch[i]);
			if (menu_item) {
				switch (state) {
					case 'disable': { menu_item.enabled = false; break; }
					case 'enable': { menu_item.enabled = true; break; }
				}
			}
		}
	}
	return true;
}

///////////////////////////////////////////////////////////////////////////////

ipc.on('toSpawn', async (event, arg) => {
	event.preventDefault();
	try {
		if (!arg.id) {
			win.main.webContents.send('fromMain', {
				command: arg.command,
				success: false,
				error: 'No spawn ID provided'
			});
			return;
		}
		
		if (!arg.command) {
			win.main.webContents.send('fromMain', {
				command: 'unknown',
				success: false,
				error: 'No command provided'
			});
			return;
		}
		
		const spawn = get_spawn_by_id(arg.id);
		if (!spawn) {
			win.main.webContents.send('fromMain', {
				command: arg.command,
				success: false,
				id: arg.id,
				error: `Spawn with ID ${arg.id} not found`
			});
			return;
		}
		
		switch(arg.command) {

			case 'kill_spawn': {
				spawn.kill();
				win.main.webContents.send('fromMain', { command: arg.command, success: true, id: arg.id });
				break;
			}

			case 'write_to_spawn': {
				const success = spawn.write(arg.cmd);
				win.main.webContents.send('fromMain', { command: arg.command, success: success, id: arg.id });
				break;
			}
			
			case 'get_spawn_status': {
				const status = spawn.getStatus();
				win.main.webContents.send('fromMain', { command: arg.command, success: true, id: arg.id, status: status });
				break;
			}
			
			default: {
				win.main.webContents.send('fromMain', {
					command: arg.command,
					success: false,
					id: arg.id,
					error: `Unknown command: ${arg.command}`
				});
				break;
			}

		}
	} catch (error) {
		console.error('Error in toSpawn handler:', error);
		win.main.webContents.send('fromMain', {
			command: arg.command,
			success: false,
			id: arg.id,
			error: error.message
		});
	}
});

///////////////////////////////////////////////////////////////////////////////
// IPC COMMUNICATION //////////////////////////////////////////////////////////

ipc.on('toMain', async (event, arg) => {
	event.preventDefault();
	if (arg.command) {
		
		switch (arg.command) {

			case 'create_spawn': {
				try {
					const id = create_spawn(arg.cmd, arg.args, arg.options);
					if (id) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: true,
							id: id
						});
					} else {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Failed to create spawn (max processes or creation error)'
						});
					}
				} catch (error) {
					console.error('Error in create_spawn:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'cleanup_spawns': {
				try {
					const count = cleanup_completed_spawns();
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						count: count
					});
				} catch (error) {
					console.error('Error in cleanup_spawns:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'get_all_spawn_statuses': {
				try {
					const statuses = get_all_spawn_statuses();
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						statuses: statuses
					});
				} catch (error) {
					console.error('Error in get_all_spawn_statuses:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'remove_spawn': {
				try {
					const success = remove_spawn_by_id(arg.id);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: success,
						id: arg.id
					});
				} catch (error) {
					console.error('Error in remove_spawn:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'execute_script': {
				try {
					const language = arg.language ? arg.language.toLowerCase() : '';
					const script_path = arg.script_path;
					const args = arg.args || [];
					const options = arg.options || {};
					
					if (!script_path) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'No script path provided'
						});
						return;
					}
					
					let result;
					
					// Check if watch_files specified - use integrated function
					if (arg.watch_files && Array.isArray(arg.watch_files) && arg.watch_files.length > 0) {
						options.watch_files = arg.watch_files;
						options.cleanup_outputs = arg.cleanup_outputs;
						options.read_timeout = arg.read_timeout;
						result = execute_script_with_output_capture(language, script_path, args, options);
					} else {
						// Use regular execution
						switch (language) {
							case 'python':
								result = execute_python(script_path, args, options);
								break;
							case 'r':
								result = execute_r(script_path, args, options);
								break;
							case 'perl':
								result = execute_perl(script_path, args, options);
								break;
							case 'node':
							case 'nodejs':
							case 'javascript':
								result = execute_node(script_path, args, options);
								break;
							case 'cpp':
							case 'c++':
								result = execute_cpp(script_path, args, options);
								break;
							case 'generic':
								result = execute_generic(script_path, args, options);
								break;
							default:
								win.main.webContents.send('fromMain', {
									command: arg.command,
									success: false,
									error: `Unsupported language: ${language}`
								});
								return;
						}
					}
					
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: result.success,
						id: result.id,
						error: result.error,
						language: language,
						script_path: script_path,
						with_output_capture: !!(arg.watch_files && arg.watch_files.length > 0)
					});
				} catch (error) {
					console.error('Error in execute_script:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'get_interpreter_paths': {
				try {
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						interpreters: app_storage.interpreters
					});
				} catch (error) {
					console.error('Error in get_interpreter_paths:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'set_interpreter_path': {
				try {
					if (!arg.language || !arg.path) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Language and path are required'
						});
						return;
					}
					const result = set_interpreter_path(arg.language, arg.path);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: result.success,
						error: result.error,
						language: arg.language
					});
				} catch (error) {
					console.error('Error in set_interpreter_path:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'validate_interpreter': {
				try {
					if (!arg.path) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Path is required'
						});
						return;
					}
					const validation = validate_interpreter_path(arg.path);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						valid: validation.valid,
						error: validation.error
					});
				} catch (error) {
					console.error('Error in validate_interpreter:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'watch_for_file': {
				try {
					if (!arg.filepath) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Filepath is required'
						});
						return;
					}

					const watcherCallback = (result) => {
						win.main.webContents.send('fromFileWatcher', {
							command: 'file_detected',
							...result
						});
					};

					const id = create_file_watcher(
						arg.filepath,
						watcherCallback,
						arg.timeout || 300000 // Default 5 minute timeout
					);

					if (id) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: true,
							id: id,
							filepath: arg.filepath
						});
					} else {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Failed to create file watcher'
						});
					}
				} catch (error) {
					console.error('Error in watch_for_file:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'watch_directory': {
				try {
					if (!arg.dirpath) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Directory path is required'
						});
						return;
					}

					const watcherCallback = (result) => {
						win.main.webContents.send('fromFileWatcher', {
							command: 'file_detected',
							...result
						});
					};

					const id = create_directory_watcher(
						arg.dirpath,
						arg.pattern || null,
						watcherCallback,
						arg.timeout || 300000 // Default 5 minute timeout
					);

					if (id) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: true,
							id: id,
							dirpath: arg.dirpath
						});
					} else {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Failed to create directory watcher'
						});
					}
				} catch (error) {
					console.error('Error in watch_directory:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'stop_file_watcher': {
				try {
					if (!arg.id) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Watcher ID is required'
						});
						return;
					}

					const success = remove_file_watcher_by_id(arg.id);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: success,
						id: arg.id
					});
				} catch (error) {
					console.error('Error in stop_file_watcher:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'cleanup_file_watchers': {
				try {
					const count = cleanup_file_watchers();
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						count: count
					});
				} catch (error) {
					console.error('Error in cleanup_file_watchers:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'read_output_file': {
				try {
					if (!arg.filepath) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Filepath is required'
						});
						return;
					}

					const result = read_output_file(arg.filepath, arg.format);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						...result
					});
				} catch (error) {
					console.error('Error in read_output_file:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'read_output_file_with_retry': {
				try {
					if (!arg.filepath) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Filepath is required'
						});
						return;
					}

					// Async operation
					read_output_file_with_retry(
						arg.filepath,
						arg.format,
						arg.maxRetries,
						arg.retryDelay
					).then((result) => {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							...result
						});
					});
				} catch (error) {
					console.error('Error in read_output_file_with_retry:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'read_multiple_output_files': {
				try {
					if (!arg.filepaths || !Array.isArray(arg.filepaths)) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Filepaths array is required'
						});
						return;
					}

					const result = read_multiple_output_files(arg.filepaths, arg.formats);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						...result
					});
				} catch (error) {
					console.error('Error in read_multiple_output_files:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'delete_output_file': {
				try {
					if (!arg.filepath) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Filepath is required'
						});
						return;
					}

					if (!fs.existsSync(arg.filepath)) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'File not found',
							filepath: arg.filepath
						});
						return;
					}

					fs.unlinkSync(arg.filepath);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						filepath: arg.filepath
					});
				} catch (error) {
					console.error('Error in delete_output_file:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message,
						filepath: arg.filepath
					});
				}
				break;
			}

			// PHASE 5: Convenience Alias Commands ////////////////////////////////

			case 'validate_script_params': {
				try {
					const validation = validate_script_execution_params(
						arg.language,
						arg.script_path,
						arg.options
					);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						valid: validation.valid,
						errors: validation.errors
					});
				} catch (error) {
					console.error('Error in validate_script_params:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'validate_output_path': {
				try {
					if (!arg.filepath) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Filepath is required'
						});
						return;
					}
					const validation = validate_output_path(arg.filepath);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						valid: validation.valid,
						error: validation.error,
						filepath: arg.filepath
					});
				} catch (error) {
					console.error('Error in validate_output_path:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'get_script_status': {
				// Alias for get_spawn_status
				try {
					if (!arg.id) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Script ID is required'
						});
						return;
					}
					const spawn = get_spawn_by_id(arg.id);
					if (!spawn) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							id: arg.id,
							error: `Script with ID ${arg.id} not found`
						});
						return;
					}
					const status = spawn.getStatus();
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						id: arg.id,
						status: status
					});
				} catch (error) {
					console.error('Error in get_script_status:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'list_running_scripts': {
				// Alias for get_all_spawn_statuses, but filtered for RUNNING only
				try {
					const allStatuses = get_all_spawn_statuses();
					const runningOnly = arg.running_only !== false; // Default true
					const statuses = runningOnly 
						? allStatuses.filter(s => s.status === 'RUNNING')
						: allStatuses;
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						scripts: statuses,
						count: statuses.length,
						running_only: runningOnly
					});
				} catch (error) {
					console.error('Error in list_running_scripts:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'kill_script': {
				// Alias for kill_spawn (via toSpawn handler)
				try {
					if (!arg.id) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Script ID is required'
						});
						return;
					}
					const spawn = get_spawn_by_id(arg.id);
					if (!spawn) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							id: arg.id,
							error: `Script with ID ${arg.id} not found`
						});
						return;
					}
					spawn.kill();
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						id: arg.id
					});
				} catch (error) {
					console.error('Error in kill_script:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			///////////////////////////////////////////////////////////////////
			// ABIF FILE OPERATIONS ///////////////////////////////////////////
			///////////////////////////////////////////////////////////////////

			case 'abif_open_dialog': {
				try {
					const result = await dialog.showOpenDialog(win.main, {
						title: 'Open AB1 File',
						properties: ['openFile'],
						filters: [
							{ name: 'AB1 Files', extensions: ['ab1', 'abi', 'abif'] },
							{ name: 'All Files', extensions: ['*'] }
						]
					});
					
					if (result.canceled || result.filePaths.length === 0) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							canceled: true
						});
						return;
					}
					
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						filePath: result.filePaths[0]
					});
				} catch (error) {
					console.error('Error in abif_open_dialog:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'abif_parse_file': {
				try {
					if (!arg.filePath) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'File path is required'
						});
						return;
					}
					
					if (!fs.existsSync(arg.filePath)) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: `File not found: ${arg.filePath}`
						});
						return;
					}
					
					const parser = await ABIFParser.fromPath(arg.filePath);
					
					// Extract commonly needed data
					const result = {
						command: arg.command,
						success: true,
						filePath: arg.filePath,
						fileName: path.basename(arg.filePath),
						header: parser.header,
						sequence: parser.getSequence(),
						sequenceLength: parser.getSequenceLength(),
						traceLength: parser.getTraceLength(),
						channelOrder: parser.getChannelOrder(),
						traces: parser.getTraces(),
						peakLocations: parser.getPeakLocations(),
						qualityScores: parser.getQualityScores(),
						metadata: parser.getMetadata(),
						tags: parser.listTags()
					};
					
					win.main.webContents.send('fromMain', result);
					
				} catch (error) {
					console.error('Error in abif_parse_file:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message,
						filePath: arg.filePath
					});
				}
				break;
			}

			case 'abif_get_tag': {
				try {
					if (!arg.filePath || !arg.tagName || arg.tagNumber === undefined) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'File path, tag name, and tag number are required'
						});
						return;
					}
					
					const parser = await ABIFParser.fromPath(arg.filePath);
					const data = parser.getTagData(arg.tagName, arg.tagNumber);
					
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						tagName: arg.tagName,
						tagNumber: arg.tagNumber,
						data: data
					});
					
				} catch (error) {
					console.error('Error in abif_get_tag:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'update_menu_item': {
				try {
					if (!arg.id) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'Menu item ID required'
						});
						break;
					}
					const menu = Menu.getApplicationMenu();
					const menuItem = menu.getMenuItemById(arg.id);
					if (menuItem) {
						menuItem.enabled = arg.enabled !== false;
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: true,
							id: arg.id,
							enabled: menuItem.enabled
						});
					} else {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: `Menu item with ID '${arg.id}' not found`
						});
					}
				} catch (error) {
					console.error('Error in update_menu_item:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'show_save_dialog': {
				try {
					const result = await dialog.showSaveDialog(win.main, {
						title: arg.title || 'Save File',
						defaultPath: arg.defaultPath,
						filters: arg.filters || [
							{ name: 'All Files', extensions: ['*'] }
						]
					});
					
					if (!result.canceled && result.filePath && arg.content !== undefined) {
						// Write file - handle binary data if specified
						if (arg.isBinary || arg.encoding === 'base64') {
							// Convert base64 string to Buffer and write as binary
							const buffer = Buffer.from(arg.content, 'base64');
							fs.writeFileSync(result.filePath, buffer);
						} else {
							// Write as UTF-8 text
							fs.writeFileSync(result.filePath, arg.content, 'utf8');
						}
						
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: true,
							filePath: result.filePath
						});
					} else {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							canceled: result.canceled
						});
					}
				} catch (error) {
					console.error('Error in show_save_dialog:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

			case 'abif_get_raw_traces': {
				try {
					if (!arg.filePath) {
						win.main.webContents.send('fromMain', {
							command: arg.command,
							success: false,
							error: 'File path is required'
						});
						return;
					}
					
					const parser = await ABIFParser.fromPath(arg.filePath);
					
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: true,
						rawTraces: parser.getRawTraces(),
						channelOrder: parser.getChannelOrder()
					});
					
				} catch (error) {
					console.error('Error in abif_get_raw_traces:', error);
					win.main.webContents.send('fromMain', {
						command: arg.command,
						success: false,
						error: error.message
					});
				}
				break;
			}

		}

	}
});

///////////////////////////////////////////////////////////////////////////////
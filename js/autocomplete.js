///////////////////////////////////////////////////////////////////////////////
// autocomplete.js

function autocomplete(input_element, autocomplete_list, append_to_element, options = {}) {

	// Default options
	const defaults = {
		match_anywhere: true,        // Match anywhere in string, not just start
		debounce_delay: 300,         // Wait 300ms after user stops typing
		async_source: null,          // Optional async function to fetch data
		min_length: 1,               // Minimum characters before searching
		render_item: null,           // Custom render function for items
		match_fn: null,              // Custom matching function
		show_all_on_focus: false,    // Show all results when input is focused
		highlight_matches: true,     // Highlight matched text (when no custom render)
		max_results: null            // Maximum number of results to show (null = unlimited)
	};
	
	const config = { ...defaults, ...options };
	
	append_to_element = append_to_element || input_element;
	const ac_container = document.createElement("div");
	ac_container.classList.add("autocomplete");
	ac_container.setAttribute("role", "listbox");
	ac_container.setAttribute("id", "autocomplete-" + guid());
	append_to_element.appendChild(ac_container);
	
	// Set up ARIA attributes on input
	input_element.setAttribute("role", "combobox");
	input_element.setAttribute("aria-autocomplete", "list");
	input_element.setAttribute("aria-expanded", "false");
	input_element.setAttribute("aria-controls", ac_container.id);
	input_element.setAttribute("autocomplete", "off");
	
	let current_focus = -1; // Track which item is focused
	let filtered_items = []; // Track current filtered list
	let debounce_timer = null; // Timer for debouncing
	let is_loading = false; // Track loading state
	let has_shown_focus_results = false; // Track if we've shown results on focus
	let data_source = autocomplete_list; // Store the current data source
	let is_destroyed = false; // Track if autocomplete has been destroyed

	// Event handlers stored for cleanup
	const handlers = {
		input_input: null,
		input_focus: null,
		input_blur: null,
		input_keydown: null,
		document_click: null,
		container_click: null
	};

	// Single global click handler for all autocomplete items (fixes memory leak)
	handlers.container_click = (e) => {
		// Check if click was on an autocomplete item
		const item = e.target.closest('.autocomplete-item');
		if (item && item.parentElement === ac_container) {
			e.preventDefault();
			// Get the stored value from data attribute
			const value = item.getAttribute('data-value');
			input_element.value = value;
			input_element.focus();
			close_autocomplete();
		}
	};
	
	// Add single click listener to container
	ac_container.addEventListener('click', handlers.container_click);

	// Handle focus event - show all results if configured
	handlers.input_focus = (e) => {
		if (config.show_all_on_focus && !has_shown_focus_results && !input_element.value) {
			has_shown_focus_results = true;
			show_all_results();
		}
	};
	input_element.addEventListener("focus", handlers.input_focus);

	// Handle blur event - reset focus flag
	handlers.input_blur = () => {
		has_shown_focus_results = false;
	};
	input_element.addEventListener("blur", handlers.input_blur);

	// Keyboard navigation
	handlers.input_keydown = (e) => {
		const items = ac_container.getElementsByClassName("autocomplete-item");
		
		if (e.key === "ArrowDown") {
			e.preventDefault();
			current_focus++;
			if (current_focus >= items.length) current_focus = 0;
			set_active(items);
		} 
		else if (e.key === "ArrowUp") {
			e.preventDefault();
			current_focus--;
			if (current_focus < 0) current_focus = items.length - 1;
			set_active(items);
		} 
		else if (e.key === "Enter") {
			e.preventDefault();
			if (current_focus > -1 && items[current_focus]) {
				items[current_focus].click();
			}
			close_autocomplete();
		} 
		else if (e.key === "Escape") {
			e.preventDefault();
			close_autocomplete();
		}
	};
	input_element.addEventListener("keydown", handlers.input_keydown);

	handlers.input_input = (e) => {
		let text = e.target.value;
		current_focus = -1; // Reset focus when typing
		has_shown_focus_results = false; // Reset flag when typing
		
		// Clear previous timer
		if (debounce_timer) {
			clearTimeout(debounce_timer);
		}
		
		if (!text || text.length < config.min_length) { 
			close_autocomplete();
			return false; 
		}
		
		// Show loading state
		show_loading();
		
		// Debounce: wait for user to stop typing
		debounce_timer = setTimeout(async () => {
			try {
				let source = data_source;
				
				// If async source is provided, fetch data
				if (config.async_source && typeof config.async_source === 'function') {
					source = await config.async_source(text);
				}
				
				// Filter and display results
				await display_results(text, source);
			} catch (error) {
				console.error('Autocomplete error:', error);
				show_error();
			}
		}, config.debounce_delay);
	};
	input_element.addEventListener("input", handlers.input_input);
	
	// Close autocomplete when clicking outside
	handlers.document_click = (event) => {
		if (!input_element.contains(event.target) && !ac_container.contains(event.target)) {
			close_autocomplete();
		}
	};
	document.addEventListener('click', handlers.document_click);
	
	// Show all results (for focus event)
	async function show_all_results() {
		show_loading();
		
		try {
			let source = data_source;
			
			// If async source is provided, fetch data with empty query
			if (config.async_source && typeof config.async_source === 'function') {
				source = await config.async_source('');
			}
			
			// Display all results without filtering
			await display_all_results(source);
		} catch (error) {
			console.error('Autocomplete error:', error);
			show_error();
		}
	}
	
	// Display all results without filtering
	async function display_all_results(source) {
		close_autocomplete();
		filtered_items = [];
		
		let count = 0;
		for (let i = 0; i < source.length; i++) {
			if (config.max_results && count >= config.max_results) break;
			
			if (source[i]) {
				const item = source[i];
				const item_string = typeof item === 'string' ? item : (item.label || item.value || String(item));
				
				filtered_items.push(item);
				count++;
				
				const element = document.createElement("div");
				element.classList.add("autocomplete-item");
				element.setAttribute("role", "option");
				element.setAttribute("id", ac_container.id + "-item-" + (filtered_items.length - 1));
				element.setAttribute('data-value', item_string);
				
				// Use custom render function if provided
				if (config.render_item && typeof config.render_item === 'function') {
					const rendered = config.render_item(item, '');
					if (typeof rendered === 'string') {
						element.innerHTML = rendered;
					} else {
						element.appendChild(rendered);
					}
				} else {
					element.textContent = item_string;
				}
				
				ac_container.appendChild(element);
			}
		}
		
		if (filtered_items.length === 0) {
			show_empty();
		} else {
			ac_container.classList.add("autocomplete__open");
			ac_container.classList.remove("autocomplete__closed");
			input_element.classList.add("input__autocomplete");
			input_element.setAttribute("aria-expanded", "true");
		}
	}
	
	// Display filtered results
	async function display_results(query, source) {
		close_autocomplete();
		filtered_items = [];
		
		let count = 0;
		// Filter data based on query
		for (let i = 0; i < source.length; i++) {
			if (config.max_results && count >= config.max_results) break;
			
			if (source[i]) {
				const item = source[i];
				const item_string = typeof item === 'string' ? item : (item.label || item.value || String(item));
				
				if (matches_query(item, query)) {
					filtered_items.push(item);
					count++;
					
					const element = document.createElement("div");
					element.classList.add("autocomplete-item");
					element.setAttribute("role", "option");
					element.setAttribute("id", ac_container.id + "-item-" + (filtered_items.length - 1));
					
					// Store the actual value in data attribute
					element.setAttribute('data-value', item_string);
					
					// Use custom render function if provided
					if (config.render_item && typeof config.render_item === 'function') {
						const rendered = config.render_item(item, query);
						if (typeof rendered === 'string') {
							element.innerHTML = rendered;
						} else {
							// If render function returns an element, append it
							element.appendChild(rendered);
						}
					} else {
						// Default rendering with optional highlighting
						if (config.highlight_matches && config.match_anywhere) {
							element.innerHTML = highlight_match(item_string, query);
						} else {
							element.textContent = item_string;
						}
					}
					
					ac_container.appendChild(element);
				}
			}
		}
		
		if (filtered_items.length === 0) {
			show_empty();
		} else {
			ac_container.classList.add("autocomplete__open");
			ac_container.classList.remove("autocomplete__closed");
			input_element.classList.add("input__autocomplete");
			input_element.setAttribute("aria-expanded", "true");
		}
	}
	
	// Flexible matching function
	function matches_query(item, query) {
		// Use custom match function if provided
		if (config.match_fn && typeof config.match_fn === 'function') {
			return config.match_fn(item, query);
		}
		
		// Default matching logic
		const item_string = typeof item === 'string' ? item : (item.label || item.value || String(item));
		const item_upper = item_string.toUpperCase();
		const query_upper = query.toUpperCase();
		
		if (config.match_anywhere) {
			// Match anywhere in the string
			return item_upper.includes(query_upper);
		} else {
			// Match only at the start (original behavior)
			return item_upper.startsWith(query_upper);
		}
	}
	
	// Highlight matched text
	function highlight_match(text, query) {
		if (!config.highlight_matches || !query) return text;
		
		const regex = new RegExp(`(${escape_regex(query)})`, 'gi');
		return text.replace(regex, '<span class="autocomplete-highlight">$1</span>');
	}
	
	// Escape special regex characters
	function escape_regex(str) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
	
	// Show loading state
	function show_loading() {
		if (is_loading) return;
		is_loading = true;
		
		ac_container.innerHTML = '';
		const loading_div = document.createElement("div");
		loading_div.classList.add("autocomplete-loading");
		loading_div.setAttribute("role", "status");
		loading_div.setAttribute("aria-live", "polite");
		loading_div.innerHTML = `
			<div class="autocomplete-loading-spinner"></div>
			<span class="autocomplete-loading-text">Loading...</span>
		`;
		ac_container.appendChild(loading_div);
		ac_container.classList.add("autocomplete__open");
		ac_container.classList.remove("autocomplete__closed");
		input_element.setAttribute("aria-expanded", "true");
		input_element.setAttribute("aria-busy", "true");
	}
	
	// Show empty state
	function show_empty() {
		ac_container.innerHTML = '';
		const empty_div = document.createElement("div");
		empty_div.classList.add("autocomplete-empty");
		empty_div.setAttribute("role", "status");
		empty_div.setAttribute("aria-live", "polite");
		empty_div.innerHTML = `
			<div class="autocomplete-empty-icon">🔍</div>
			<div class="autocomplete-empty-text">No results found</div>
		`;
		ac_container.appendChild(empty_div);
		ac_container.classList.add("autocomplete__open");
		ac_container.classList.remove("autocomplete__closed");
		input_element.setAttribute("aria-expanded", "true");
		is_loading = false;
		input_element.removeAttribute("aria-busy");
	}
	
	// Show error state
	function show_error() {
		ac_container.innerHTML = '';
		const error_div = document.createElement("div");
		error_div.classList.add("autocomplete-empty");
		error_div.setAttribute("role", "alert");
		error_div.setAttribute("aria-live", "assertive");
		error_div.innerHTML = `
			<div class="autocomplete-empty-icon">⚠️</div>
			<div class="autocomplete-empty-text">Error loading results</div>
		`;
		ac_container.appendChild(error_div);
		ac_container.classList.add("autocomplete__open");
		ac_container.classList.remove("autocomplete__closed");
		is_loading = false;
		input_element.removeAttribute("aria-busy");
	}
	
	// Set active item for keyboard navigation
	function set_active(items) {
		if (!items || items.length === 0) return;
		
		// Remove active class and aria-selected from all items
		for (let i = 0; i < items.length; i++) {
			items[i].classList.remove("autocomplete-item--active");
			items[i].removeAttribute("aria-selected");
		}
		
		// Add active class and aria-selected to current item
		if (current_focus >= 0 && current_focus < items.length) {
			items[current_focus].classList.add("autocomplete-item--active");
			items[current_focus].setAttribute("aria-selected", "true");
			
			// Update aria-activedescendant on input
			input_element.setAttribute("aria-activedescendant", items[current_focus].id);
			
			// Scroll item into view if needed
			items[current_focus].scrollIntoView({ block: "nearest", behavior: "smooth" });
		} else {
			input_element.removeAttribute("aria-activedescendant");
		}
	}
	
	// Close the autocomplete container
	function close_autocomplete() {
		ac_container.innerHTML = "";
		ac_container.classList.remove("autocomplete__open");
		ac_container.classList.add("autocomplete__closed");
		input_element.classList.remove("input__autocomplete");
		input_element.setAttribute("aria-expanded", "false");
		input_element.removeAttribute("aria-activedescendant");
		input_element.removeAttribute("aria-busy");
		current_focus = -1;
		filtered_items = [];
		is_loading = false;
		
		// Clear any pending debounce timer
		if (debounce_timer) {
			clearTimeout(debounce_timer);
			debounce_timer = null;
		}
	}
	
	// PUBLIC API - Return object with methods for better control
	return {
		/**
		 * Destroy the autocomplete instance and clean up all event listeners
		 */
		destroy: () => {
			if (is_destroyed) return;
			
			// Remove all event listeners
			if (handlers.container_click) {
				ac_container.removeEventListener('click', handlers.container_click);
			}
			if (handlers.input_focus) {
				input_element.removeEventListener('focus', handlers.input_focus);
			}
			if (handlers.input_blur) {
				input_element.removeEventListener('blur', handlers.input_blur);
			}
			if (handlers.input_keydown) {
				input_element.removeEventListener('keydown', handlers.input_keydown);
			}
			if (handlers.input_input) {
				input_element.removeEventListener('input', handlers.input_input);
			}
			if (handlers.document_click) {
				document.removeEventListener('click', handlers.document_click);
			}
			
			// Clear any pending timers
			if (debounce_timer) {
				clearTimeout(debounce_timer);
				debounce_timer = null;
			}
			
			// Remove autocomplete container from DOM
			if (ac_container && ac_container.parentNode) {
				ac_container.parentNode.removeChild(ac_container);
			}
			
			// Remove ARIA attributes from input
			input_element.removeAttribute('role');
			input_element.removeAttribute('aria-autocomplete');
			input_element.removeAttribute('aria-expanded');
			input_element.removeAttribute('aria-controls');
			input_element.removeAttribute('aria-activedescendant');
			input_element.removeAttribute('aria-busy');
			input_element.classList.remove('input__autocomplete');
			
			// Mark as destroyed
			is_destroyed = true;
		},
		
		/**
		 * Refresh the autocomplete with new data
		 * @param {Array} new_data - New array of data items
		 */
		refresh: (new_data) => {
			if (is_destroyed) {
				console.warn('Cannot refresh destroyed autocomplete');
				return;
			}
			
			data_source = new_data;
			close_autocomplete();
			
			// If input has value, re-trigger search with new data
			if (input_element.value && input_element.value.length >= config.min_length) {
				const event = new Event('input', { bubbles: true });
				input_element.dispatchEvent(event);
			}
		},
		
		/**
		 * Set the value of the input element
		 * @param {string} value - Value to set
		 * @param {boolean} trigger_search - Whether to trigger autocomplete search (default: false)
		 */
		setValue: (value, trigger_search = false) => {
			if (is_destroyed) {
				console.warn('Cannot set value on destroyed autocomplete');
				return;
			}
			
			input_element.value = value;
			
			if (trigger_search && value && value.length >= config.min_length) {
				const event = new Event('input', { bubbles: true });
				input_element.dispatchEvent(event);
			} else {
				close_autocomplete();
			}
		},
		
		/**
		 * Get the current value of the input element
		 * @returns {string}
		 */
		getValue: () => {
			return input_element.value;
		},
		
		/**
		 * Open the autocomplete dropdown (shows all results if configured)
		 */
		open: () => {
			if (is_destroyed) {
				console.warn('Cannot open destroyed autocomplete');
				return;
			}
			
			if (config.show_all_on_focus) {
				show_all_results();
			} else if (input_element.value && input_element.value.length >= config.min_length) {
				const event = new Event('input', { bubbles: true });
				input_element.dispatchEvent(event);
			}
		},
		
		/**
		 * Close the autocomplete dropdown
		 */
		close: () => {
			if (is_destroyed) {
				console.warn('Cannot close destroyed autocomplete');
				return;
			}
			
			close_autocomplete();
		},
		
		/**
		 * Check if the autocomplete has been destroyed
		 * @returns {boolean}
		 */
		isDestroyed: () => {
			return is_destroyed;
		},
		
		/**
		 * Get the autocomplete container element
		 * @returns {HTMLElement}
		 */
		getContainer: () => {
			return ac_container;
		},
		
		/**
		 * Get the input element
		 * @returns {HTMLElement}
		 */
		getInput: () => {
			return input_element;
		}
	};
	
}

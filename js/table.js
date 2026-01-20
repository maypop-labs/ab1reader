///////////////////////////////////////////////////////////////////////////////
// table.js

function create_headerless_table(data, checkbox, options) {
	//////////////////////////////////////////////////////////////////////
	// This function takes an array of objects and creates
	// a scrollable table.  The first field of each object is not displayed
	// on the table, but is returned within a custom event that is
	// triggered when each table row is clicked.
	// An object with the following elements is returned:
	//  table_obj.body		         	<-- the HTML element of the table body
	//  table_obj.element          	<-- the HTML element of the table
	//  table_obj.header           	<-- the HTML element of the table header (if select_all enabled)
	//	table_obj.id								<-- the object id
	//  table_obj.refresh(new_data) <-- method to update data without recreating
	//  table_obj.filter(query)     <-- method to filter table rows
	//  table_obj.clear_filter()    <-- method to clear active filter
	//  table_obj.hidden_column     <-- name of the first (hidden) column
	//  table_obj.visible_columns   <-- array of visible column names
	//  table_obj.get_selected()    <-- get array of hidden column values for selected rows
	//  table_obj.select_all()      <-- select all checkboxes
	//  table_obj.deselect_all()    <-- deselect all checkboxes
	//  table_obj.show_loading()    <-- display loading state
	//  table_obj.hide_loading()    <-- hide loading state
	//  table_obj.show_empty(msg)   <-- display empty state with optional message
	//  table_obj.hide_empty()      <-- hide empty state
	//////////////////////////////////////////////////////////////////////
	if (typeof (data) === "undefined") { return undefined; }
	if (typeof (checkbox) === "undefined") { checkbox = false; }
	if (typeof (options) === "undefined") { options = {}; }
	
	const id = guid();
	const table_obj = {};
	let current_data = data;
	let filtered_data = data;
	let current_focused_row = -1;
	let active_filter = "";
	let is_loading = false;
	let is_empty = false;

	// Column configuration with defaults
	const column_config = options.columns || {};
	const enable_search = options.enable_search || false;
	const select_all_checkbox = options.select_all || false;
	const empty_message = options.empty_message || "No data available";
	const loading_message = options.loading_message || "Loading...";

	// Expose column information
	if (data && data[0]) {
		const keys = Object.keys(data[0]);
		table_obj.hidden_column = keys[0];
		table_obj.visible_columns = keys.slice(1);
	}

	table_obj.id = id;
	table_obj.element = document.createElement("div");
	table_obj.table = document.createElement("table");
	
	// Add search input if enabled
	if (enable_search) {
		const search_container = create_search_input();
		table_obj.element.appendChild(search_container);
	}
	
	// Add header with select all checkbox if enabled
	if (checkbox && select_all_checkbox) {
		table_obj.header = create_table_header(id, data);
		table_obj.table.appendChild(table_obj.header);
	}
	
	table_obj.body = create_table_body(id, filtered_data);
	table_obj.element.appendChild(table_obj.table);
	table_obj.table.appendChild(table_obj.body);
	table_obj.element.classList.add("table_container");
	table_obj.table.classList.add("noselect");
	
	// ARIA attributes for accessibility
	table_obj.table.setAttribute("role", "table");
	table_obj.table.setAttribute("aria-label", "Data table");
	table_obj.element.setAttribute("tabindex", "0");
	
	// Check if we should show empty state initially
	if (!data || data.length === 0) {
		table_obj.show_empty();
	}

	function create_search_input() {
		const search_container = document.createElement("div");
		search_container.classList.add("table_search_container");
		
		const search_input = document.createElement("input");
		search_input.type = "text";
		search_input.classList.add("table_search_input");
		search_input.placeholder = "Search table...";
		search_input.setAttribute("aria-label", "Search table");
		
		search_input.addEventListener("input", (e) => {
			const query = e.target.value;
			table_obj.filter(query);
		});
		
		search_container.appendChild(search_input);
		return search_container;
	}

	function create_table_header(id, data) {
		if (!data || !data[0]) { return null; }
		
		const keys = Object.keys(data[0]);
		const table_header = document.createElement("thead");
		table_header.id = "table-header-" + id;
		table_header.setAttribute("role", "rowgroup");
		
		const tr = document.createElement("tr");
		tr.setAttribute("role", "row");
		
		for (let i = 1; i < keys.length; i++) {
			const th = document.createElement("th");
			th.setAttribute("role", "columnheader");
			
			const key = keys[i];
			const config = column_config[key] || {};
			
			// Apply width to header
			if (config.width) {
				th.style.width = config.width;
			}
			
			// Apply alignment to header
			if (config.align) {
				th.style.textAlign = config.align;
			}
			
			// First column gets select all checkbox
			if (i === 1) {
				const checkbox_container = document.createElement("div");
				checkbox_container.style.display = "inline-block";
				
				const select_all = document.createElement("input");
				select_all.type = "checkbox";
				select_all.id = "select-all-" + id;
				select_all.classList.add("table_select_all");
				select_all.setAttribute("aria-label", "Select all rows");
				
				select_all.addEventListener("change", (e) => {
					const checkboxes = table_obj.body.querySelectorAll('input[type="checkbox"]');
					checkboxes.forEach(cb => {
						cb.checked = e.target.checked;
					});
				});
				
				checkbox_container.appendChild(select_all);
				th.appendChild(checkbox_container);
				
				const column_name = document.createElement("span");
				column_name.innerHTML = "&nbsp;" + keys[i].charAt(0).toUpperCase() + keys[i].slice(1);
				th.appendChild(column_name);
			} else {
				const column_name = keys[i].charAt(0).toUpperCase() + keys[i].slice(1);
				th.innerHTML = column_name;
			}
			
			tr.appendChild(th);
		}
		
		table_header.appendChild(tr);
		return table_header;
	}

	function create_table_body(id, data) {
		const tbody = document.createElement("tbody");
		tbody.setAttribute("role", "rowgroup");
		
		if (!data || !data[0]) { 
			return tbody;
		}
		
		const keys = Object.keys(data[0]);
		
		for (let i = 0; i < data.length; i++) {
			const tr = document.createElement("tr");
			tr.setAttribute("role", "row");
			tr.setAttribute("tabindex", "-1");
			tr.setAttribute("data-row-index", i);
			tr.classList.add("table_row");
			
			for (let j = 1; j < keys.length; j++) {
				const td = document.createElement("td");
				td.setAttribute("role", "cell");
				
				// Apply column configuration
				const key = keys[j];
				const config = column_config[key] || {};
				
				// Apply width
				if (config.width) {
					td.style.width = config.width;
				}
				
				// Apply alignment
				if (config.align) {
					td.style.textAlign = config.align;
				}
				
				// Apply formatter function or use default
				let value = data[i][key];
				if (config.formatter && typeof config.formatter === "function") {
					value = config.formatter(value, data[i]);
				}
				
				let innerHTML = value;
				if (j === 1 && checkbox) { 
					innerHTML = '<input type="checkbox" data-secret="' + data[i][keys[0]] + '">' + innerHTML; 
				}
				td.innerHTML = innerHTML;
				td.setAttribute("data-secret", data[i][keys[0]]);
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
			tr.addEventListener("click", (e) => {
				let target = e.target;
				let secret = target.getAttribute("data-secret");
				while (typeof secret != "string") {
					target = target.parentNode;
					secret = target.getAttribute("data-secret");
				}
				const row_event = new CustomEvent("table_row", { bubbles: true, detail: { id: id, text: secret } });
				target.dispatchEvent(row_event);
			});
		}
		return tbody;
	}

	function create_state_row(message, state_class) {
		const tbody = document.createElement("tbody");
		tbody.setAttribute("role", "rowgroup");
		tbody.classList.add(state_class);
		
		const tr = document.createElement("tr");
		tr.setAttribute("role", "row");
		
		const td = document.createElement("td");
		td.setAttribute("role", "cell");
		td.setAttribute("colspan", "100");
		td.classList.add("table_state_cell");
		td.innerHTML = message;
		
		tr.appendChild(td);
		tbody.appendChild(tr);
		
		return tbody;
	}

	// Keyboard navigation support
	table_obj.element.addEventListener("keydown", (e) => {
		const rows = table_obj.body.querySelectorAll("tr");
		if (rows.length === 0) return;

		switch(e.key) {
			case "ArrowDown":
				e.preventDefault();
				current_focused_row = Math.min(current_focused_row + 1, rows.length - 1);
				rows[current_focused_row].focus();
				break;
			case "ArrowUp":
				e.preventDefault();
				current_focused_row = Math.max(current_focused_row - 1, 0);
				rows[current_focused_row].focus();
				break;
			case "Home":
				e.preventDefault();
				current_focused_row = 0;
				rows[current_focused_row].focus();
				break;
			case "End":
				e.preventDefault();
				current_focused_row = rows.length - 1;
				rows[current_focused_row].focus();
				break;
			case "Enter":
			case " ":
				e.preventDefault();
				if (current_focused_row >= 0 && current_focused_row < rows.length) {
					rows[current_focused_row].click();
				}
				break;
		}
	});

	// Initialize focus on first row when table receives focus
	table_obj.element.addEventListener("focus", () => {
		if (current_focused_row === -1) {
			const rows = table_obj.body.querySelectorAll("tr");
			if (rows.length > 0) {
				current_focused_row = 0;
				rows[0].focus();
			}
		}
	});

	// Show loading state
	table_obj.show_loading = function() {
		is_loading = true;
		is_empty = false;
		const old_body = table_obj.body;
		table_obj.body = create_state_row(loading_message, "table_loading_state");
		table_obj.table.replaceChild(table_obj.body, old_body);
		table_obj.element.setAttribute("aria-busy", "true");
	};

	// Hide loading state
	table_obj.hide_loading = function() {
		if (!is_loading) return;
		is_loading = false;
		const old_body = table_obj.body;
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.replaceChild(table_obj.body, old_body);
		table_obj.element.setAttribute("aria-busy", "false");
		
		// Check if we should show empty state
		if (!filtered_data || filtered_data.length === 0) {
			table_obj.show_empty();
		}
	};

	// Show empty state
	table_obj.show_empty = function(custom_message) {
		is_empty = true;
		is_loading = false;
		const message = custom_message || empty_message;
		const old_body = table_obj.body;
		table_obj.body = create_state_row(message, "table_empty_state");
		table_obj.table.replaceChild(table_obj.body, old_body);
		table_obj.element.setAttribute("aria-busy", "false");
	};

	// Hide empty state
	table_obj.hide_empty = function() {
		if (!is_empty) return;
		is_empty = false;
		const old_body = table_obj.body;
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.replaceChild(table_obj.body, old_body);
	};

	// Filter method for searching within table
	table_obj.filter = function(query) {
		active_filter = query.toLowerCase();
		
		if (!query || query.trim() === "") {
			filtered_data = current_data;
		} else {
			filtered_data = current_data.filter(row => {
				const keys = Object.keys(row);
				for (let i = 1; i < keys.length; i++) {
					const value = String(row[keys[i]]).toLowerCase();
					if (value.includes(active_filter)) {
						return true;
					}
				}
				return false;
			});
		}
		
		current_focused_row = -1;
		const old_body = table_obj.body;
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.replaceChild(table_obj.body, old_body);
		
		// Show empty state if no results
		if (!filtered_data || filtered_data.length === 0) {
			table_obj.show_empty("No results found");
		}
		
		// Reset select all checkbox if present
		if (checkbox && select_all_checkbox) {
			const select_all = table_obj.element.querySelector(".table_select_all");
			if (select_all) {
				select_all.checked = false;
			}
		}
	};

	// Clear filter method
	table_obj.clear_filter = function() {
		active_filter = "";
		filtered_data = current_data;
		const search_input = table_obj.element.querySelector(".table_search_input");
		if (search_input) {
			search_input.value = "";
		}
		current_focused_row = -1;
		const old_body = table_obj.body;
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.replaceChild(table_obj.body, old_body);
		
		// Show empty state if no data
		if (!filtered_data || filtered_data.length === 0) {
			table_obj.show_empty();
		}
		
		// Reset select all checkbox if present
		if (checkbox && select_all_checkbox) {
			const select_all = table_obj.element.querySelector(".table_select_all");
			if (select_all) {
				select_all.checked = false;
			}
		}
	};

	// Refresh method to update data without recreating the entire table
	table_obj.refresh = function(new_data) {
		if (!new_data || !Array.isArray(new_data)) {
			console.error("Invalid data provided to refresh method");
			return;
		}
		current_data = new_data;
		
		// Update exposed column information
		if (new_data && new_data[0]) {
			const keys = Object.keys(new_data[0]);
			table_obj.hidden_column = keys[0];
			table_obj.visible_columns = keys.slice(1);
		}
		
		// Reapply filter if active
		if (active_filter) {
			table_obj.filter(active_filter);
		} else {
			filtered_data = new_data;
			current_focused_row = -1;
			const old_body = table_obj.body;
			table_obj.body = create_table_body(id, new_data);
			table_obj.table.replaceChild(table_obj.body, old_body);
			
			// Show empty state if no data
			if (!new_data || new_data.length === 0) {
				table_obj.show_empty();
			}
		}
		
		// Reset select all checkbox if present
		if (checkbox && select_all_checkbox) {
			const select_all = table_obj.element.querySelector(".table_select_all");
			if (select_all) {
				select_all.checked = false;
			}
		}
	};

	// Get selected rows method
	table_obj.get_selected = function() {
		const selected = [];
		const checkboxes = table_obj.body.querySelectorAll('input[type="checkbox"]:checked');
		checkboxes.forEach(cb => {
			const secret = cb.getAttribute("data-secret");
			if (secret) {
				selected.push(secret);
			}
		});
		return selected;
	};

	// Select all method
	table_obj.select_all = function() {
		const checkboxes = table_obj.body.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach(cb => {
			cb.checked = true;
		});
		const select_all = table_obj.element.querySelector(".table_select_all");
		if (select_all) {
			select_all.checked = true;
		}
	};

	// Deselect all method
	table_obj.deselect_all = function() {
		const checkboxes = table_obj.body.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach(cb => {
			cb.checked = false;
		});
		const select_all = table_obj.element.querySelector(".table_select_all");
		if (select_all) {
			select_all.checked = false;
		}
	};

	return table_obj;

}

////////////////////////////////////////////////////////////////////////

function create_table(data, options) {
	//////////////////////////////////////////////////////////////////////
	// This function takes an array of objects and creates
	// a scrollable table.  The first field of each object is not displayed
	// on the table, but is returned within a custom event that is
	// triggered when each table row is clicked.
	// An object with the following elements is returned:
	//  table_obj.body		         	<-- the HTML element of the table body
	//  table_obj.element          	<-- the HTML element of the table
	//  table_obj.header	         	<-- the HTML element of the table header
	//	table_obj.id								<-- the object id
	//  table_obj.refresh(new_data) <-- method to update data without recreating
	//  table_obj.filter(query)     <-- method to filter table rows
	//  table_obj.clear_filter()    <-- method to clear active filter
	//  table_obj.hidden_column     <-- name of the first (hidden) column
	//  table_obj.visible_columns   <-- array of visible column names
	//  table_obj.get_selected()    <-- get array of hidden column values for selected rows
	//  table_obj.select_all()      <-- select all checkboxes
	//  table_obj.deselect_all()    <-- deselect all checkboxes
	//  table_obj.show_loading()    <-- display loading state
	//  table_obj.hide_loading()    <-- hide loading state
	//  table_obj.show_empty(msg)   <-- display empty state with optional message
	//  table_obj.hide_empty()      <-- hide empty state
	//////////////////////////////////////////////////////////////////////
	if (typeof (data) === "undefined") { return undefined; }
	if (typeof (options) === "undefined") { options = {}; }
	
	const id = guid();
	const table_obj = {};
	const keys = Object.keys(data[0]);
	let current_data = data;
	let filtered_data = data;
	let current_focused_row = -1;
	let active_filter = "";
	let is_loading = false;
	let is_empty = false;

	// Column configuration with defaults
	const column_config = options.columns || {};
	const enable_search = options.enable_search || false;
	const enable_checkboxes = options.checkboxes || false;
	const select_all_checkbox = options.select_all || false;
	const empty_message = options.empty_message || "No data available";
	const loading_message = options.loading_message || "Loading...";

	// Expose column information
	table_obj.hidden_column = keys[0];
	table_obj.visible_columns = keys.slice(1);

	// establish the default sort
	data.sort((a, b) => {
		if (a[keys[1]] < b[keys[1]]) { return -1; }
		if (a[keys[1]] > b[keys[1]]) { return 1; }
		return 0;
	});

	table_obj.id = id;
	table_obj.element = document.createElement("div");
	table_obj.table = document.createElement("table");
	
	// Add search input if enabled
	if (enable_search) {
		const search_container = create_search_input();
		table_obj.element.appendChild(search_container);
	}
	
	table_obj.header = create_table_header(id, data);
	table_obj.body = create_table_body(id, data);
	table_obj.element.appendChild(table_obj.table);
	table_obj.table.appendChild(table_obj.header);
	table_obj.table.appendChild(table_obj.body);
	table_obj.element.classList.add("table_container");
	table_obj.element.classList.add("overflow_y");
	table_obj.table.classList.add("noselect");
	
	// ARIA attributes for accessibility
	table_obj.table.setAttribute("role", "table");
	table_obj.table.setAttribute("aria-label", "Sortable data table");
	table_obj.element.setAttribute("tabindex", "0");
	
	// Check if we should show empty state initially
	if (!data || data.length === 0) {
		table_obj.show_empty();
	}

	function create_search_input() {
		const search_container = document.createElement("div");
		search_container.classList.add("table_search_container");
		
		const search_input = document.createElement("input");
		search_input.type = "text";
		search_input.classList.add("table_search_input");
		search_input.placeholder = "Search table...";
		search_input.setAttribute("aria-label", "Search table");
		
		search_input.addEventListener("input", (e) => {
			const query = e.target.value;
			table_obj.filter(query);
		});
		
		search_container.appendChild(search_input);
		return search_container;
	}

	function create_caret(toggle) {
		const caret = document.createElement("span");
		caret.classList.add("caret");
		caret.setAttribute("aria-hidden", "true");
		if (toggle === "desc") { caret.innerHTML = "&#9660;"; }
		else { caret.innerHTML = "&#9650;"; }
		return caret;
	}

	function create_spacer() {
		const spacer = document.createElement("span");
		spacer.classList.add("header_spacer");
		spacer.setAttribute("aria-hidden", "true");
		spacer.innerHTML = "&#9660;";
		return spacer;
	}

	function create_table_body(id, data) {
		const tbody = document.createElement("tbody");
		tbody.setAttribute("role", "rowgroup");
		
		if (!data || !data[0]) { 
			return tbody;
		}
		
		const keys = Object.keys(data[0]);
		
		for (let i = 0; i < data.length; i++) {
			const tr = document.createElement("tr");
			tr.setAttribute("role", "row");
			tr.setAttribute("tabindex", "-1");
			tr.setAttribute("data-row-index", i);
			tr.classList.add("table_row");
			
			for (let j = 1; j < keys.length; j++) {
				const td = document.createElement("td");
				td.setAttribute("role", "cell");
				
				// Apply column configuration
				const key = keys[j];
				const config = column_config[key] || {};
				
				// Apply width
				if (config.width) {
					td.style.width = config.width;
				}
				
				// Apply alignment
				if (config.align) {
					td.style.textAlign = config.align;
				}
				
				// Apply formatter function or use default
				let value = data[i][key];
				if (config.formatter && typeof config.formatter === "function") {
					value = config.formatter(value, data[i]);
				}
				
				// Add checkbox to first column if enabled
				let innerHTML = value;
				if (j === 1 && enable_checkboxes) {
					innerHTML = '<input type="checkbox" data-secret="' + data[i][keys[0]] + '">' + innerHTML;
				}
				
				td.innerHTML = innerHTML;
				td.setAttribute("data-secret", data[i][keys[0]]);
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
			tr.addEventListener("click", (e) => {
				let target = e.target;
				let secret = target.getAttribute("data-secret");
				while (typeof secret != "string") {
					target = target.parentNode;
					secret = target.getAttribute("data-secret");
				}
				const row_event = new CustomEvent("table_row", { bubbles: true, detail: { id: id, text: secret } });
				target.dispatchEvent(row_event);
			});
		}
		return tbody;
	}

	function create_state_row(message, state_class) {
		const tbody = document.createElement("tbody");
		tbody.setAttribute("role", "rowgroup");
		tbody.classList.add(state_class);
		
		const tr = document.createElement("tr");
		tr.setAttribute("role", "row");
		
		const td = document.createElement("td");
		td.setAttribute("role", "cell");
		td.setAttribute("colspan", "100");
		td.classList.add("table_state_cell");
		td.innerHTML = message;
		
		tr.appendChild(td);
		tbody.appendChild(tr);
		
		return tbody;
	}

	function create_table_header(id, data) {
		const keys = Object.keys(data[0]);
		const table_header = document.createElement("thead");
		table_header.id = "table-header-" + id;
		table_header.setAttribute("role", "rowgroup");
		
		const tr = document.createElement("tr");
		tr.setAttribute("role", "row");
		
		for (let i = 1; i < keys.length; i++) {
			const th = document.createElement("th");
			th.setAttribute("role", "columnheader");
			th.setAttribute("aria-sort", i === 1 ? "descending" : "none");
			th.setAttribute("tabindex", "0");
			th.id = "column-" + i + "-" + id;
			th.setAttribute("data-index", i);
			th.setAttribute("data-toggle", "desc");
			
			const key = keys[i];
			const config = column_config[key] || {};
			
			// Apply width to header
			if (config.width) {
				th.style.width = config.width;
			}
			
			// Apply alignment to header
			if (config.align) {
				th.style.textAlign = config.align;
			}
			
			// Add active sort class to first column
			if (i === 1) {
				th.classList.add("table_header_active");
			}
			
			const column_name = keys[i].charAt(0).toUpperCase() + keys[i].slice(1);
			
			// First column gets select all checkbox if enabled
			if (i === 1 && enable_checkboxes && select_all_checkbox) {
				const checkbox_container = document.createElement("div");
				checkbox_container.style.display = "inline-block";
				
				const select_all = document.createElement("input");
				select_all.type = "checkbox";
				select_all.id = "select-all-" + id;
				select_all.classList.add("table_select_all");
				select_all.setAttribute("aria-label", "Select all rows");
				
				select_all.addEventListener("change", (e) => {
					const checkboxes = table_obj.body.querySelectorAll('input[type="checkbox"]');
					checkboxes.forEach(cb => {
						cb.checked = e.target.checked;
					});
				});
				
				checkbox_container.appendChild(select_all);
				th.appendChild(checkbox_container);
				
				const column_text = document.createElement("span");
				column_text.innerHTML = "&nbsp;" + column_name;
				th.appendChild(column_text);
			} else {
				th.innerHTML = column_name;
			}
			
			th.setAttribute("aria-label", "Sort by " + column_name);
			
			if (i === 1) {
				const caret = create_caret("desc");
				th.appendChild(caret);
			}
			else {
				const spacer = create_spacer();
				th.appendChild(spacer);
			}
			tr.appendChild(th);

			th.addEventListener("click", (e) => {
				// Don't sort if clicking on checkbox
				if (e.target.type === "checkbox") {
					return;
				}
				handle_header_click(e.target);
			});
			
			// Add keyboard support for header sorting
			th.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handle_header_click(e.target);
				}
			});
		}
		table_header.appendChild(tr);
		return table_header;
	}

	function handle_header_click(target) {
		if (target.classList.contains("caret")) { target = target.parentNode; }
		if (target.classList.contains("header_spacer")) { target = target.parentNode; }
		const index = parseInt(target.getAttribute("data-index"));
		const toggle = target.getAttribute("data-toggle");
		
		// Remove active class from all headers
		const all_headers = table_obj.header.querySelectorAll("th");
		all_headers.forEach(header => {
			header.classList.remove("table_header_active");
		});
		
		// Add active class to clicked header
		target.classList.add("table_header_active");
		
		// sort data
		table_obj.table.removeChild(table_obj.body);
		filtered_data = data_sort(filtered_data, index, toggle);
		
		// Update toggle state
		const new_toggle = toggle === "desc" ? "asc" : "desc";
		target.setAttribute("data-toggle", new_toggle);
		
		// Update ARIA sort attribute
		target.setAttribute("aria-sort", new_toggle === "desc" ? "descending" : "ascending");
		
		// Clear aria-sort from other headers
		all_headers.forEach(header => {
			if (header !== target) {
				header.setAttribute("aria-sort", "none");
			}
		});
		
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.appendChild(table_obj.body);
		
		// flip caret
		let caret = table_obj.header.getElementsByClassName("caret")[0];
		if (caret && caret.parentNode) {
			caret.parentNode.appendChild(create_spacer());
			caret.parentNode.removeChild(caret);
		}
		caret = create_caret(new_toggle);
		const spacer = target.getElementsByClassName("header_spacer")[0];
		target.removeChild(spacer);
		target.appendChild(caret);
	}

	function data_sort(data, index, toggle) {
		const keys = Object.keys(data[0]);
		data.sort((a, b) => {
			if (toggle === "desc") {
				if (a[keys[index]] < b[keys[index]]) { return 1; }
				if (a[keys[index]] > b[keys[index]]) { return -1; }
				return 0;
			}
			else {
				if (a[keys[index]] < b[keys[index]]) { return -1; }
				if (a[keys[index]] > b[keys[index]]) { return 1; }
				return 0;
			}
		});
		return data;
	}

	// Keyboard navigation support
	table_obj.element.addEventListener("keydown", (e) => {
		const rows = table_obj.body.querySelectorAll("tr");
		if (rows.length === 0) return;

		switch(e.key) {
			case "ArrowDown":
				e.preventDefault();
				current_focused_row = Math.min(current_focused_row + 1, rows.length - 1);
				rows[current_focused_row].focus();
				break;
			case "ArrowUp":
				e.preventDefault();
				current_focused_row = Math.max(current_focused_row - 1, 0);
				rows[current_focused_row].focus();
				break;
			case "Home":
				e.preventDefault();
				current_focused_row = 0;
				rows[current_focused_row].focus();
				break;
			case "End":
				e.preventDefault();
				current_focused_row = rows.length - 1;
				rows[current_focused_row].focus();
				break;
			case "Enter":
			case " ":
				e.preventDefault();
				if (current_focused_row >= 0 && current_focused_row < rows.length) {
					rows[current_focused_row].click();
				}
				break;
		}
	});

	// Initialize focus on first row when table receives focus
	table_obj.element.addEventListener("focus", () => {
		if (current_focused_row === -1) {
			const rows = table_obj.body.querySelectorAll("tr");
			if (rows.length > 0) {
				current_focused_row = 0;
				rows[0].focus();
			}
		}
	});

	// Show loading state
	table_obj.show_loading = function() {
		is_loading = true;
		is_empty = false;
		const old_body = table_obj.body;
		table_obj.body = create_state_row(loading_message, "table_loading_state");
		table_obj.table.replaceChild(table_obj.body, old_body);
		table_obj.element.setAttribute("aria-busy", "true");
	};

	// Hide loading state
	table_obj.hide_loading = function() {
		if (!is_loading) return;
		is_loading = false;
		const old_body = table_obj.body;
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.replaceChild(table_obj.body, old_body);
		table_obj.element.setAttribute("aria-busy", "false");
		
		// Check if we should show empty state
		if (!filtered_data || filtered_data.length === 0) {
			table_obj.show_empty();
		}
	};

	// Show empty state
	table_obj.show_empty = function(custom_message) {
		is_empty = true;
		is_loading = false;
		const message = custom_message || empty_message;
		const old_body = table_obj.body;
		table_obj.body = create_state_row(message, "table_empty_state");
		table_obj.table.replaceChild(table_obj.body, old_body);
		table_obj.element.setAttribute("aria-busy", "false");
	};

	// Hide empty state
	table_obj.hide_empty = function() {
		if (!is_empty) return;
		is_empty = false;
		const old_body = table_obj.body;
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.replaceChild(table_obj.body, old_body);
	};

	// Filter method for searching within table
	table_obj.filter = function(query) {
		active_filter = query.toLowerCase();
		
		if (!query || query.trim() === "") {
			filtered_data = current_data;
		} else {
			filtered_data = current_data.filter(row => {
				const keys = Object.keys(row);
				for (let i = 1; i < keys.length; i++) {
					const value = String(row[keys[i]]).toLowerCase();
					if (value.includes(active_filter)) {
						return true;
					}
				}
				return false;
			});
		}
		
		// Preserve sort state after filtering
		const active_header = table_obj.header.querySelector('[aria-sort="ascending"], [aria-sort="descending"]');
		if (active_header) {
			const sort_index = parseInt(active_header.getAttribute("data-index"));
			const sort_toggle = active_header.getAttribute("data-toggle");
			filtered_data = data_sort(filtered_data, sort_index, sort_toggle);
		}
		
		current_focused_row = -1;
		const old_body = table_obj.body;
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.replaceChild(table_obj.body, old_body);
		
		// Show empty state if no results
		if (!filtered_data || filtered_data.length === 0) {
			table_obj.show_empty("No results found");
		}
		
		// Reset select all checkbox if present
		if (enable_checkboxes && select_all_checkbox) {
			const select_all = table_obj.element.querySelector(".table_select_all");
			if (select_all) {
				select_all.checked = false;
			}
		}
	};

	// Clear filter method
	table_obj.clear_filter = function() {
		active_filter = "";
		filtered_data = current_data;
		const search_input = table_obj.element.querySelector(".table_search_input");
		if (search_input) {
			search_input.value = "";
		}
		
		// Preserve sort state
		const active_header = table_obj.header.querySelector('[aria-sort="ascending"], [aria-sort="descending"]');
		if (active_header) {
			const sort_index = parseInt(active_header.getAttribute("data-index"));
			const sort_toggle = active_header.getAttribute("data-toggle");
			filtered_data = data_sort(filtered_data, sort_index, sort_toggle);
		}
		
		current_focused_row = -1;
		const old_body = table_obj.body;
		table_obj.body = create_table_body(id, filtered_data);
		table_obj.table.replaceChild(table_obj.body, old_body);
		
		// Show empty state if no data
		if (!filtered_data || filtered_data.length === 0) {
			table_obj.show_empty();
		}
		
		// Reset select all checkbox if present
		if (enable_checkboxes && select_all_checkbox) {
			const select_all = table_obj.element.querySelector(".table_select_all");
			if (select_all) {
				select_all.checked = false;
			}
		}
	};

	// Refresh method to update data without recreating the entire table
	table_obj.refresh = function(new_data) {
		if (!new_data || !Array.isArray(new_data)) {
			console.error("Invalid data provided to refresh method");
			return;
		}
		
		current_data = new_data;
		
		// Update exposed column information
		if (new_data && new_data[0]) {
			const keys = Object.keys(new_data[0]);
			table_obj.hidden_column = keys[0];
			table_obj.visible_columns = keys.slice(1);
		}
		
		// Reapply filter if active
		if (active_filter) {
			table_obj.filter(active_filter);
		} else {
			// Preserve current sort state
			const active_header = table_obj.header.querySelector('[aria-sort="ascending"], [aria-sort="descending"]');
			let sort_index = 1;
			let sort_toggle = "asc";
			
			if (active_header) {
				sort_index = parseInt(active_header.getAttribute("data-index"));
				sort_toggle = active_header.getAttribute("data-toggle");
			}
			
			// Update data and apply current sort
			filtered_data = new_data;
			filtered_data = data_sort(filtered_data, sort_index, sort_toggle);
			current_focused_row = -1;
			
			// Replace body
			const old_body = table_obj.body;
			table_obj.body = create_table_body(id, filtered_data);
			table_obj.table.replaceChild(table_obj.body, old_body);
			
			// Show empty state if no data
			if (!new_data || new_data.length === 0) {
				table_obj.show_empty();
			}
		}
		
		// Reset select all checkbox if present
		if (enable_checkboxes && select_all_checkbox) {
			const select_all = table_obj.element.querySelector(".table_select_all");
			if (select_all) {
				select_all.checked = false;
			}
		}
	};

	// Get selected rows method
	table_obj.get_selected = function() {
		const selected = [];
		const checkboxes = table_obj.body.querySelectorAll('input[type="checkbox"]:checked');
		checkboxes.forEach(cb => {
			const secret = cb.getAttribute("data-secret");
			if (secret) {
				selected.push(secret);
			}
		});
		return selected;
	};

	// Select all method
	table_obj.select_all = function() {
		const checkboxes = table_obj.body.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach(cb => {
			cb.checked = true;
		});
		const select_all = table_obj.element.querySelector(".table_select_all");
		if (select_all) {
			select_all.checked = true;
		}
	};

	// Deselect all method
	table_obj.deselect_all = function() {
		const checkboxes = table_obj.body.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach(cb => {
			cb.checked = false;
		});
		const select_all = table_obj.element.querySelector(".table_select_all");
		if (select_all) {
			select_all.checked = false;
		}
	};

	return table_obj;

}

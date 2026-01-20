///////////////////////////////////////////////////////////////////////////////
// search_bar.js

function create_search_bar(autocomplete_list) {
	//////////////////////////////////////////////////////////////////////
	// This function takes a list of autocomplete terms and creates
	// a standard autocomplete-enabled search bar.
	// An object with the following elements is returned:
	//	search_bar_obj.autocomplete    <-- the autocomplete API object (for control)
	//	search_bar_obj.button          <-- the HTML element of the input button
	//  search_bar_obj.element         <-- the HTML element of the search bar
	//	search_bar_obj.id              <-- the object id
	//  search_bar_obj.input           <-- the HTML element of the input field
	//	search_bar_obj.destroy()       <-- method to clean up the search bar
	//////////////////////////////////////////////////////////////////////
	if (typeof (autocomplete_list) === 'undefined') { autocomplete_list = false; }
	const id = guid();
	const search_bar = document.createElement("div");
	search_bar.classList.add('form_group');
	search_bar.style.display = 'relative';
	search_bar.id = 'search_bar_' + id;
	search_bar.style.marginBottom = '0px';
	// Table search HTML
	let search_bar_html = '';
	search_bar_html += '<div class="center">';
	search_bar_html += '<input type="text" id="search_input_' + id + '" value="" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="1">';
	search_bar_html += '<img class="icon search_icon" alt="search icon" data-for="search_input_' + id + '" src="' + search_icon_url + '" id="search_button_' + id + '">';
	search_bar_html += '</div>'; // end center
	search_bar.innerHTML = search_bar_html;
	const search_bar_input = search_bar.getElementsByTagName('input')[0];
	const search_bar_button = search_bar.getElementsByTagName('img')[0];
	
	// Create autocomplete with new API and store the returned object
	let autocomplete_api = null;
	if (autocomplete_list) {
		autocomplete_api = autocomplete(search_bar_input, autocomplete_list, search_bar, {
			match_anywhere: true,
			debounce_delay: 200,
			highlight_matches: true,
			show_all_on_focus: false,
			max_results: 10
		});
	}
	
	const search_bar_obj = {};
	search_bar_obj.id = id;
	search_bar_obj.element = search_bar;
	search_bar_obj.input = search_bar_input;
	search_bar_obj.button = search_bar_button;
	search_bar_obj.autocomplete = autocomplete_api; // Expose autocomplete API

	search_bar_obj.button.addEventListener("click", (e) => {
		search_bar_obj.input.blur();
		const search_event = new CustomEvent('search_bar', { bubbles: true, detail: { id: id, text: search_bar_input.value } });
		e.target.dispatchEvent(search_event);
		// To use: Add an event listener on search_bar_obj.element for event 'search_bar' and match to the id
	});
	
	search_bar_obj.input.addEventListener("keydown", (e) => {
		search_bar_obj.input.classList.remove('error');
		if (e.key === "Enter") {
			e.preventDefault();
			search_bar_obj.button.click();
		}
	});
	
	// Add destroy method to clean up both search bar and autocomplete
	search_bar_obj.destroy = () => {
		// Destroy autocomplete if it exists
		if (autocomplete_api && !autocomplete_api.isDestroyed()) {
			autocomplete_api.destroy();
		}
		
		// Remove event listeners
		// Note: Button and input listeners will be removed when element is removed from DOM
		
		// Remove element from DOM
		if (search_bar.parentNode) {
			search_bar.parentNode.removeChild(search_bar);
		}
	};

	return search_bar_obj;
}

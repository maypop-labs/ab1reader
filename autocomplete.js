///////////////////////////////////////////////////////////////////////////////
// autocomplete.js

function autocomplete(input, arr, append_to_html_element) {

	let currentFocus = -1;
	append_to_html_element = append_to_html_element || input;

	input.addEventListener('input', function (e) {
	
		let text = e.target.value;
		closeAllLists();
		if (!text) { return false; }
		const list = document.createElement('div');
		list.id = 'autocomplete-list-' + e.id;
		list.classList.add('autocomplete_items');
		list.style.width = append_to_html_element.offsetWidth + 'px';
		list.style.marginLeft = append_to_html_element.style.marginLeft;
		// insert the list immediately after append_to_html_element in the DOM
		append_to_html_element.parentNode.insertBefore(list, append_to_html_element.nextSibling);
		const location = list.getBoundingClientRect();
		list.style.position = 'fixed';
		list.style.left = location.left;
		list.style.top = location.top;
		
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] && typeof (arr[i]) === 'string' && arr[i].substr(0, text.length).toUpperCase() == text.toUpperCase()) {
				const list_element = document.createElement('div');
				list_element.innerHTML = arr[i] + '<input type="hidden" value="' + arr[i] + '">';
				list_element.addEventListener('click', (e) => {
					const hidden_input_field = e.target.getElementsByTagName('input');
					if (hidden_input_field?.[0]?.value) {
						input.value = e.target.getElementsByTagName('input')[0].value;
						input.focus();
						closeAllLists();
					}
				});

				list.appendChild(list_element);
			}
		}

		if (list.innerHTML == '') { list.style.display = 'none'; }
		else { list.style.display = 'block'; }

	});

	input.addEventListener('keydown', function (e) {
		var x = document.getElementById('autocomplete-list-' + e.id);
		if (x) { x = x.getElementsByTagName('div'); }
		if (e.key === 'ArrowDown') {
			currentFocus++;
			addActive(x);
		}
		else if (e.key === 'ArrowUp') {
			if (currentFocus > -1) {
				currentFocus--;
				addActive(x);
			}
		}
		else if ((e.key === 'Enter') || (e.key === 'Tab')) {
			if (currentFocus > -1) {
				if (x) { x[currentFocus].click(); }
			}
			else {
				if (e.target.parentNode.childNodes) {
					if (e.target.parentNode.childNodes[1]) {
						if (e.target.parentNode.childNodes[1].childNodes) {
							if (e.target.parentNode.childNodes[1].childNodes[0]) {
								input.value = e.target.parentNode.childNodes[1].childNodes[0].textContent;
								closeAllLists(e.target);
							}
						}
					}
				}
			}
		}
	});
	
	function addActive(x) {
		if (!x) { return false; }
		removeActive(x);
		if (currentFocus >= x.length) { currentFocus = 0; }
		if (currentFocus < 0) { currentFocus = (x.length - 1); }
		x[currentFocus].classList.add('autocomplete_active');
	}
	
	function closeAllLists(list_element) {
		var x = document.getElementsByClassName('autocomplete_items');
		for (var i = 0; i < x.length; i++) {
			if (list_element != x[i] && list_element != input) {
				x[i].parentNode.removeChild(x[i]);
			}
		}
	}

	function removeActive(x) {
		for (var i = 0; i < x.length; i++) {
			x[i].classList.remove('autocomplete_active');
		}
	}

	document.addEventListener('click', function (e) { closeAllLists(e.target); });

}

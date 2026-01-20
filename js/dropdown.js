///////////////////////////////////////////////////////////////////////////////
// dropdown.js

function create_dropdown_input(options, title, tooltip, default_option) {

	// global variables
	const obj = {};
	const id = guid();
	if (!Array.isArray(options)) { options = []; }
	if (typeof title !== "string") { title = ""; }
	if (typeof tooltip != "string") { tooltip = ""; }
	if (typeof default_option != "string") { if (options.length) { default_option = options[0]; } else { default_option = ""; } }

	// DOM construction
	const everything = document.createElement("div");
	const label = document.createElement("label");
	const button = document.createElement("button");
	const content = document.createElement("div");
	if (typeof title === "string") {
		if (typeof tooltip === "string" && tooltip.length) { title = title + create_tooltip(tooltip); }
		label.innerHTML = title;
	}

	// set element attributes
	everything.id = id;
	everything.setAttribute("data-value", default_option);
	label.setAttribute("for", "dropdown_button_" + id);
	button.id = "dropdown_button_" + id;
	button.innerHTML = default_option;

	// css classes
	everything.classList.add("form_group");
	everything.classList.add("dropdown_container");
	button.classList.add("dropdown");
	content.classList.add("dropdown_content");
	content.classList.add("overflow_y");

	// put it all together
	everything.appendChild(label);
	everything.appendChild(button);
	everything.appendChild(content);

	for (let i = 0; i < options.length; i++) {
		if (typeof options[i] === "number") { options[i] = options[i].toString(); }
		if (typeof options[i] !== "string") { continue; }
		const option = document.createElement("div");
		option.setAttribute("data-value", options[i]);
		option.innerHTML = options[i];
		content.appendChild(option);
		option.addEventListener("click", (e) => {
			e.preventDefault();
			obj.set_value(e.target.getAttribute("data-value"));
			obj._content.classList.toggle('show');
		});
	}

	// public member variables
	obj.element = everything;
	obj.id = id;
	
	// private member variables
	obj._button = button;
	obj._content = content;
	obj._label = label;
	obj._value = obj.element.getAttribute("data-value");

	/////////////////////////////////////////////////////////////////////////////
	// PRIVATE METHODS //////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////////
	// PUBLIC METHODS ///////////////////////////////////////////////////////////

	obj.export_as_string = () => {
		return obj._value;
	}

	obj.export_as_value = () => {
		const value = Number(obj._value);
		if (value === "NaN") { return 0; }
		return value;
	}

	obj.get_value = () => {
		return obj._value;
	}

	obj.make_large = () => {
		obj.element.classList.add("large");
		obj.element.classList.remove("medium");
		obj.element.classList.remove("small");
	}

	obj.make_medium = () => {
		obj.element.classList.remove("large");
		obj.element.classList.add("medium");
		obj.element.classList.remove("small");
	}

	obj.make_small = () => {
		obj.element.classList.remove("large");
		obj.element.classList.remove("medium");
		obj.element.classList.add("small");
	}

	obj.set_label = (str, tooltip) => {
		if (typeof str !== "string") { str = ""; }
		if (typeof tooltip === "string") { str += create_tooltip(tooltip); }
		obj._label.innerHTML = str;
		if (typeof tooltip === "string") { initialize_tooltips(); }
	}

	obj.set_value = (value) => {
		obj.element.setAttribute("data-value", value);
		obj._button.innerHTML = value;
		obj._value = value;
	}

	/////////////////////////////////////////////////////////////////////////////
	// EVENT LISTENERS //////////////////////////////////////////////////////////
	obj._button.addEventListener("click", (e) => {
		e.preventDefault();
		//if (obj?.element?.parentNode) { obj?.element?.parentNode.focus(); }
		obj._content.classList.toggle('show');
	});
	/////////////////////////////////////////////////////////////////////////////
	// RETURN ///////////////////////////////////////////////////////////////////
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
/* Pre-defined speciality dropdown categories                                */
///////////////////////////////////////////////////////////////////////////////
function create_badge_dropdown(options, title, tooltip, default_option) {
	const obj = create_dropdown_input([], title, tooltip, default_option);
	obj.add_array_of_badges = (arr) => {
		if (typeof arr === "undefined") { return; }
		if (!Array.isArray(arr)) { return; }
		if (!arr.length) { return; }
		obj._content.innerHTML = "";
		for (let i = 0; i < arr.length; i++) {
			const badge = arr[i].badge;
			const option = document.createElement("div");
			option.setAttribute("data-value", badge);
			option.innerHTML = badge;
			obj._content.appendChild(option);
			// option event listener
			option.addEventListener("click", (e) => {
				e.preventDefault();
				obj.set_value(e.target.getAttribute("data-value"));
				obj._content.classList.toggle('show');
			});
		}
		obj.set_value(arr[0].badge);
	}
	obj.add_array_of_badges(options);
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
function create_length_dropdown(title, tooltip, default_option) {
	if (typeof title !== "string") { title = ""; }
	const obj = create_dropdown_input(length_unit_names, title, tooltip, default_option);
	obj.get_abbreviation = () => {
		const key = obj.get_value();
		return length_unit_name_to_abbreviation[key];
	}
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
function create_length_abbreviation_dropdown(title, tooltip, default_option) {
	if (typeof title !== "string") { title = ""; }
	const obj = create_dropdown_input(length_unit_abbreviations, title, tooltip, default_option);
	obj.get_full_name = () => {
		const key = obj.get_value();
		return length_unit_abbreviation_to_name[key];
	}
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
function create_us_state_abbreviation_dropdown(title, tooltip, default_option) {
	if (typeof title !== "string") { title = ""; }
	const obj = create_dropdown_input(us_state_abbreviations, title, tooltip, default_option);
	obj.get_full_state_name = () => {
		const key = obj.get_value();
		return us_state_abbreviation_to_state_name[key];
	}
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
function create_us_state_dropdown(title, tooltip, default_option) {
	if (typeof title !== "string") { title = ""; }
	const obj = create_dropdown_input(us_states, title, tooltip, default_option);
	obj.get_two_letter_state = () => {
		const key = obj.get_value();
		return us_state_name_to_abbreviation[key];
	}
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
function create_weight_dropdown(title, tooltip, default_option) {
	if (typeof title !== "string") { title = ""; }
	const obj = create_dropdown_input(weight_unit_names, title, tooltip, default_option);
	obj.get_abbreviation = () => {
		const key = obj.get_value();
		return weight_unit_name_to_abbreviation[key];
	}
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
function create_weight_abbreviation_dropdown(title, tooltip, default_option) {
	if (typeof title !== "string") { title = ""; }
	const obj = create_dropdown_input(weight_unit_abbreviations, title, tooltip, default_option);
	obj.get_full_name = () => {
		const key = obj.get_value();
		return weight_unit_abbreviation_to_name[key];
	}
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
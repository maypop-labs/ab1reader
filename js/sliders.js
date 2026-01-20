///////////////////////////////////////////////////////////////////////////////
// slider.js

function create_slider(title, tooltip) {

	// global variables
	const obj = {};
	const id = "slider_" + guid();

	// DOM construction
	const everything = document.createElement("div");
	const slider_row = document.createElement("div");
	const slider_label_container = document.createElement("div");
	const slider_container = document.createElement("div");
	const label = document.createElement("label");
	const input = document.createElement("input");
	const span = document.createElement("span");
	// set element attributes
	//slider_label_container.innerHTML = "Slider";
	input.setAttribute("type", "checkbox");
	input.id = "slider_input_" + id;
	input.value = "1";
	label.setAttribute("for", "slider_input_" + id);
	
	// css classes
	label.classList.add("switch");
	slider_container.classList.add("slider_container");
	slider_label_container.classList.add("slider_label_container");
	slider_row.classList.add("slider_row");
	span.classList.add("slider");
	span.classList.add("slider-on-off");
	span.classList.add("round");
	
	// put it all together
	everything.appendChild(slider_row);
	slider_row.appendChild(slider_label_container);
	slider_row.appendChild(slider_container);
	slider_container.appendChild(label);
	label.appendChild(input);
	label.appendChild(span);

	// private member variables
	obj._input = input;
	obj._label = slider_label_container;
	
	// public member variables
	obj.element = everything;
	obj.id = id;

	/////////////////////////////////////////////////////////////////////////////
	// PRIVATE METHODS //////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////////
	// PUBLIC METHODS ///////////////////////////////////////////////////////////

	obj.export_as_boolean = () => {
		if (obj._input.checked) { return true; }
		return false;
	}

	obj.export_as_string = () => {
		if (obj._input.checked) { return "1"; }
		return "0";
	}

	obj.export_as_value = () => {
		if (obj._input.checked) { return 1; }
		return 0;
	}

	obj.is_on = () => {
		if (obj._input.checked) { return true; }
		return false;
	}

	obj.is_off = () => {
		if (obj._input.checked) { return false; }
		return true;
	}

	obj.off = () => { obj._input.checked = false; }

	obj.on = () => { obj._input.checked = true; }

	obj.set_label = (str, tooltip) => {
		if (typeof str !== "string") { return; }
		if (typeof tooltip === "string") { str += create_tooltip(tooltip); }
		obj._label.innerHTML = str;
		if (typeof tooltip === "string") { initialize_tooltips(); }
	}

	obj.set_value = (value) => {
		if (typeof value === "string") { value = Number(value).toFixed(0); }
		if (value) { obj._input.checked = true; }
		else { obj._input.checked = false; }
	}

	/////////////////////////////////////////////////////////////////////////////
	// EVENT LISTENERS //////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////////
	// RETURN ///////////////////////////////////////////////////////////////////

	obj.set_label(title, tooltip);

	return obj;

}
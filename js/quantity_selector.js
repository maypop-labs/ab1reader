///////////////////////////////////////////////////////////////////////////////
// quantity_selector.js

function create_quantity_selector(title, min, max) {
	// parameters
	if (typeof min === "string") { min = parseInt(min); }
	if (typeof max === "string") { max = parseInt(max); }
	if (typeof min !== "number") { min = 1; }
	if (typeof max !== "number") { max = 99; }

	// global variables
	const obj = {};
	const id = "quantity_selector_" + guid();
	const container = document.createElement("div");
	const button_minus = document.createElement("button");
	const button_plus = document.createElement("button");
	const form_group = document.createElement("div");
	const input = document.createElement("input");
	const label = document.createElement("label");

	// DOM construction
	container.id = id;
	container.classList.add("quantity_selector_container");
	button_minus.classList.add("quantity_selector_button");
	button_plus.classList.add("quantity_selector_button");
	button_minus.innerHTML = '<i aria-hidden="true" class="fa fa-minus"></i>';
	button_plus.innerHTML = '<i aria-hidden="true" class="fa fa-plus"></i>';
	form_group.classList.add("form_group");
	input.classList.add("quantity_selector_input");
	input.type = "text";
	input.value = "1";
	input.max = max;
	input.min = min;
	input.pattern = "[0-9]*";
	label.for = id;
	label.innerHTML = title || "";

	// put it all together
	form_group.appendChild(label);
	form_group.appendChild(container);
	container.appendChild(button_minus);
	container.appendChild(input);
	container.appendChild(button_plus);

	// object constructor
	obj.id = id;
	obj.element = form_group;
	obj.input = input;
	obj.max = max;
	obj.min = min;

	// event listeners
	button_minus.addEventListener("click", (e) => {
		e.preventDefault();
		let value = parseInt(obj.input.value);
		if (typeof value === "string") { parseInt(value); }
		if (typeof value !== "number") { value = min; }
		value = value - 1;
		if (value < min) { value = min; }
		obj.input.value = value;
		const event = new CustomEvent("quantity_changed", { bubbles: true, detail: { id: obj.id, value: parseInt(obj.input.value) } });
		obj.element.dispatchEvent(event);
		// To use: Add an event listener on the document for event "quantity_changed"

	})

	button_plus.addEventListener("click", (e) => {
		e.preventDefault();
		let value = parseInt(obj.input.value);
		if (typeof value === "string") { parseInt(value); }
		if (typeof value !== "number") { value = 1; }
		value = value + 1;
		if (value > max) { value = max; }
		obj.input.value = value;
		const event = new CustomEvent("quantity_changed", { bubbles: true, detail: { id: obj.id, value: parseInt(obj.input.value) } });
		obj.element.dispatchEvent(event);
		// To use: Add an event listener on the document for event "quantity_changed"
	})

	input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.target.blur(); } });

	input.addEventListener("blur", () => { 
		const event = new CustomEvent("quantity_changed", { bubbles: true, detail: { id: obj.id, value: parseInt(obj.input.value) } });
		obj.element.dispatchEvent(event);
		// To use: Add an event listener on the document for event "quantity_changed"
	});

	/////////////////////////////////////////////////////////////////////////////
	// METHODS //////////////////////////////////////////////////////////////////

	obj.get_value = () => {
		return parseInt(obj.input.value);
	}

	obj.set_value = (value) => {
		if (value < min) { value = min; }
		if (value > max) { value = max; }
		obj.input.value = value;
	}

	return obj;

}

///////////////////////////////////////////////////////////////////////////////
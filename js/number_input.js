///////////////////////////////////////////////////////////////////////////////
// number_input.js

function create_integer_input() {
	// global variables
	const obj = {};
	const id = "integer_input_" + guid();
	// DOM construction
	const everything = document.createElement("div");
	const input = document.createElement("input");
	// set element attributes
	everything.id = id;
	everything.style.width = "100%";
	input.setAttribute("min", "0");
	input.setAttribute("step", "1");
	input.setAttribute("type", "number");
	input.value = "0";
	// css classes
	input.classList.add("number_input__integer");
	// put it all together
	everything.appendChild(input);
	// private member variables
	obj._input = input;
	// public member variables
	obj.element = everything;
	obj.id = id;
	/////////////////////////////////////////////////////////////////////////////
	// PRIVATE METHODS //////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////
	// PUBLIC METHODS ///////////////////////////////////////////////////////////
	obj.export_as_string = () => {
		const value = parseInt(obj._input.value);
		return value.toString();
	}
	obj.export_as_value = () => {
		return parseInt(obj._input.value);
	}
	obj.set_value = (value) => {
		obj._input.value = value;
	}
	/////////////////////////////////////////////////////////////////////////////
	// EVENT LISTENERS //////////////////////////////////////////////////////////
	obj._input.addEventListener("change", () => {
		let current_value = obj._input.value;
		if (!current_value.includes(".")) { return; }
		let parts = current_value.split(".");
		current_value = parts[0] + "." + parts[1];
		current_value = Math.round(parseFloat(current_value));
		obj._input.value = current_value;
	});
	/////////////////////////////////////////////////////////////////////////////
	// RETURN ///////////////////////////////////////////////////////////////////
	return obj;
}
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
function create_money_input() {
	// global variables
	const obj = {};
	const id = "money_input_" + guid();
	// DOM construction
	const currency_symbol = document.createElement("span");
	const everything = document.createElement("div");
	const input = document.createElement("input");
	// set element attributes
	currency_symbol.innerHTML = "$";
	everything.id = id;
	everything.style.width = "100%";
	input.setAttribute("min", "0.00");
	input.setAttribute("step", "0.01");
	input.setAttribute("type", "number");
	input.value = "0.00";
	// css classes
	currency_symbol.classList.add("number_input__money__currency_symbol");
	input.classList.add("number_input__money");
	// put it all together
	everything.appendChild(input);
	everything.appendChild(currency_symbol);
	// private member variables
	obj._currency_symbol = currency_symbol;
	obj._input = input;
	// public member variables
	obj.element = everything;
	obj.id = id;
	/////////////////////////////////////////////////////////////////////////////
	// PRIVATE METHODS //////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////
	// PUBLIC METHODS ///////////////////////////////////////////////////////////
	obj.export_as_string = () => {
		const value = parseFloat(obj._input.value).toFixed(2);
		return value.toString();
	}
	obj.export_as_value = () => {
		return parseFloat(obj._input.value).toFixed(2);
	}
	obj.set_currency_symbol = (str) => {
		if (typeof str !== "string") { return; }
		str = str.substring(0, 2);
		obj._currency_symbol.innerHTML = str;
	}
	obj.set_value = (value) => {
		obj._input.value = value;
	}
	/////////////////////////////////////////////////////////////////////////////
	// EVENT LISTENERS //////////////////////////////////////////////////////////
	obj._input.addEventListener("change", () => {
		let current_value = obj._input.value;
		if (!current_value.includes(".")) {
			current_value += ".00";
			obj._input.value = current_value;
			return;
		}
		let parts = current_value.split(".");
		parts[1] = parts[1].substring(0, 2);
		if (parts[1].length === 1) { parts[1] = parts[1] + "0"; }
		obj._input.value = parts[0] + "." + parts[1];
	});
	/////////////////////////////////////////////////////////////////////////////
	// RETURN ///////////////////////////////////////////////////////////////////
	return obj;
}
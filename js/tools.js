///////////////////////////////////////////////////////////////////////////////
// tools.js

class TOOLS {

  constructor() { }

	are_equal(var1, var2, optional_regex) {
		if (typeof optional_regex === "string") { optional_regex = new RegExp(optional_regex, "g"); }
		if (typeof var1 !== typeof var2) { return false; }
		switch (typeof var1) {
			case "object": {
				try {
					var1 = JSON.stringify(var1);
					var2 = JSON.stringify(var2);
					return var1.toLowerCase() === var2.toLowerCase();
				}
				catch { return false; }
			}
			case "string": {
				if (optional_regex instanceof RegExp) {
					var1 = var1.match(optional_regex)?.[0] || var1;
					var2 = var2.match(optional_regex)?.[0] || var2;
				}
				return var1.toLowerCase() === var2.toLowerCase();
			}
			default: { break; }
		}
		return var1 === var2;
	}

	clean_text(str) {
		str = str.replace(/[/\\?%*:|"<>]/g, " "); // removes all illegal file characters
		str = str.replace(/[^\x20-\x7E]/g, ""); // removes all non-printable characters
		str = str.trim();
		return str;
	}

  escape_string(array_of_objects, str, esc) {
		if (!this.is_array_of_objects(array_of_objects)) { return array_of_objects; }
		if (typeof (str) !== "string") { return array_of_objects; }
		if (typeof (esc) !== "string") { esc = "\\" + str; }
		const keys = Object.keys(array_of_objects[0]);
		const re = new RegExp(str, "g");
		for (let i = 0; i < array_of_objects.length; i++) {
			for (let j = 0; j < keys.length; j++) {
				const element = array_of_objects[i][keys[j]];
				if (typeof (element) === "string") {
					array_of_objects[i][keys[j]] = element.replace(re, esc);
				}
			}
		}
		return array_of_objects;
	}

	get_unique_columns(array_of_objects) {
		if (!Array.isArray(array_of_objects)) { return array_of_objects; }
		if (!array_of_objects.length || typeof (array_of_objects[0]) !== "object") { return array_of_objects; }
		let all_keys = [];
		for (let i = 0; i < array_of_objects.length; i++) {
			if (typeof (array_of_objects[i]) === "undefined") { continue; }
			const keys = Object.keys(array_of_objects[i]);
			all_keys = all_keys.concat(keys);
		}
		return Array.from(new Set(all_keys));
	}

  is_array_of_arrays(data) {
		if (!Array.isArray(data)) { return false; }
		if (!data.length) { return false; }
		for (let i = 0; i < data.length; i++) {
			if (!Array.isArray(data[i])) { return false; }
		}
		return true;
	}

	is_array_of_objects(data) {
		if (!Array.isArray(data)) { return false; }
		if (!data.length) { return false; }
		for (let i = 0; i < data.length; i++) {
			if (typeof (data[0]) !== "object") { return false; }
		}
		return true;
	}

	json_to_objects(array_of_objects) {
		// The parameter array_of_objects is expected to be an array of objects.
		if (!Array.isArray(array_of_objects)) { return array_of_objects; }
		if (!array_of_objects.length || typeof(array_of_objects[0]) !== "object") { return array_of_objects; }
		const keys = Object.keys(array_of_objects[0]);
		for (let i = 0; i < array_of_objects.length; i++) {
			for (let j = 0; j < keys.length; j++) {
				const element = array_of_objects[i][keys[j]];
				if (typeof (element) === "string") {
					if (element.charAt(0) === "[" || element.charAt(0) === "{") {
						try { array_of_objects[i][keys[j]] = JSON.parse(element); }
						catch { continue; }
					}
				}
			}
		}
		return array_of_objects;
	}

	objects_to_json(array_of_objects) {
		// The parameter array_of_objects is expected to be an array of objects.
		if (!this.is_array_of_objects(array_of_objects)) { return ""; }
		array_of_objects = JSON.parse(JSON.stringify(array_of_objects));
		if (!Array.isArray(array_of_objects)) { return array_of_objects; }
		if (!array_of_objects.length || typeof (array_of_objects[0]) !== "object") { return array_of_objects; }
		const keys = Object.keys(array_of_objects[0]);
		for (let i = 0; i < array_of_objects.length; i++) {
			for (let j = 0; j < keys.length; j++) {
				const element = array_of_objects[i][keys[j]];
				if (typeof (element) === "object") {
						try { array_of_objects[i][keys[j]] = JSON.stringify(element); }
						catch { continue; }
				}
			}
		}
		return array_of_objects;
	}

	parse_file(str, delimiter) {
		if (!str || typeof(str) !== "string") { return []; }
		if (!delimiter || typeof (delimiter) !== "string") { delimiter = ","; }
		const arr = [];
		let lines = str.split(/\r?\n/);
		for (let i = 0; i < lines.length; i++) {
			let data = lines[i].split(delimiter);
			arr.push(data);
		}
		return this.json_to_objects(this.to_array_of_objects(arr));
	}

	async pause(ms) {
		return new Promise((resolve) => {
			if (typeof (ms) !== "number") { ms = 400; }
			setTimeout(() => { return resolve(); }, ms);
		});
	}

	soft_includes(arr, term) {
		if (!Array.isArray(arr)) { return false; }
		if (!term) { return false; }
		const match = arr.find((y) => { return y.includes(term); });
		if (typeof (match) === "undefined") { return false; }
		return true;
	}

  to_array_of_arrays(array_of_objects) {
		if (!this.is_array_of_objects(array_of_objects)) { return []; }
		const data = [];
		const header = [];
		const keys = Object.keys(array_of_objects[0]);
		for (let i = 0; i < keys.length; i++) { header.push(keys[i]); }
		data.push(header);
		for (let i = 0; i < array_of_objects.length; i++) {
			const row = [];
			for (let j = 0; j < keys.length; j++) {
				row.push(array_of_objects[i][keys[j]]);
			}
			data.push(row);
		}
		return data;
	}

	to_array_of_objects(array_of_arrays) {
		if (!this.is_array_of_arrays(array_of_arrays)) { return []; }
		const data = [];
		const keys = array_of_arrays[0];
		for (let i = 0; i < keys.length; i++) {
			switch (typeof (keys[i])) {
				case "number": { keys[i] = keys[i].toString(); break; }
				case "string": {
					keys[i] = keys[i]
						.replace(/[-\/\\ ]/g, "_")
						.replace(/[^A-Za-z0-9_]/g, "")
						.toLowerCase();
					break;
				}
				default: { keys[i] = "column_" + i; }
			}
		}
		for (let i = 1; i < array_of_arrays.length; i++) {
			const obj = {}
			for (let j = 0; j < array_of_arrays[i].length; j++) {
				obj[keys[j]] = array_of_arrays[i][j];
			}
			data.push(obj);
		}
		return data;
	}

	to_delimited_string(array_of_objects, delimiter) {
		if (!this.is_array_of_objects(array_of_objects)) { return ""; }
		if (typeof (delimiter) !== "string") { return ""; }
		array_of_objects = JSON.parse(JSON.stringify(array_of_objects));
		let aoo = this.objects_to_json(array_of_objects);
		if (delimiter === ",") { aoo = this.escape_string(aoo, ",", "|"); }
		const aoa = this.to_array_of_arrays(aoo);
		let contents = "";
		for (let i = 0; i < aoa.length; i++) {
			for (let j = 0; j < aoa[i].length; j++) {
				if (j) { contents += delimiter; }
				contents += aoa[i][j];
			}
			if (i < aoa.length - 1) { contents += "\n"; }
		}
		return contents;
	}

}

const tools = new TOOLS();

module.exports = { tools }
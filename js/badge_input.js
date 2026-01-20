///////////////////////////////////////////////////////////////////////////////
// badge_input.js

function create_badge_input(title, placeholder) {
	const id = guid();
	const obj = { };
	const form_group = document.createElement("div");
	const input_area = document.createElement("div");
	const input_label = document.createElement("label");
	const input_badge_area = document.createElement("div");
	const input = document.createElement("input");
	form_group.id = id;
	form_group.classList.add("form_group");
	input_label.setAttribute("for", "input_" + id)
	if (typeof title === "string") { input_label.innerHTML = title; }
	input_badge_area.classList.add("badge_area");
	input.id = "input_" + id;
	input.setAttribute("type", "text");
	input.setAttribute("spellcheck", "false");
	input.setAttribute("autocomplete", "off");
	input.setAttribute("autocorrect", "off");
	input.setAttribute("autocapitalize", "off");
	if (typeof placeholder === "string") { input.setAttribute("placeholder", placeholder); }

	form_group.appendChild(input_label);
	form_group.appendChild(input_badge_area);
	form_group.appendChild(input);
	input_area.appendChild(form_group);

	obj._time_in_ms_of_last_input = 0;
	obj._timeout = undefined;
	obj.badge_area = input_badge_area;
	obj.delay_ms = 3000;
	obj.element = input_area;
	obj.id = id;
	obj.input = input;
	obj.personal = "";
	obj.type = "default";

	obj.input.addEventListener("input", () => { obj.get_badges_from_input(); });

	/////////////////////////////////////////////////////////////////////////////
	// PRIVATE METHODS //////////////////////////////////////////////////////////

	obj._add_email_badge = (string_or_object) => {
		let object = { };
		if (typeof string_or_object === "string") {
			let str = string_or_object;
			if (!str.includes("@")) { return; }
			str = str.replace('"', "").replace("'", "");
			str = str.replace("<", "").replace(">", "");
			str = str.trim();
			object = { host: "", mailbox: "", personal: obj.personal };
			let parts = str.split("@");
			if (parts.length != 2) { return; }
			object.host = parts[1].trim();
			parts = parts[0].split(" ");
			object.mailbox = parts[parts.length - 1].trim();
			parts.splice(parts.length - 1, 1);
			if (!object?.personal?.length) { object.personal = parts.join(" ").trim(); }
		}
		else if (typeof string_or_object === "object") { object = string_or_object; } else { return; }
		if (!object?.host) { object.host = ""; }
		if (!object?.mailbox) { object.mailbox = ""; }
		if (!object?.personal) { object.personal = obj.personal; }
		const badge = document.createElement("div");
		badge.classList.add("badge");
		badge.setAttribute("data-personal", object.personal);
		badge.setAttribute("data-mailbox", object.mailbox);
		badge.setAttribute("data-host", object.host);
		const badge_close = document.createElement("span");
		badge_close.classList.add("badge_close");
		badge_close.innerHTML = '&times;';
		badge.innerHTML = object.mailbox + "@" + object.host;
		badge.appendChild(badge_close);
		obj.badge_area.appendChild(badge);
		obj.remove_duplicate_badges();

		badge.addEventListener("click", (e) => {
			const target = e.target;
			const badge_event = new CustomEvent("badge_click", { bubbles: true, detail: { id: obj.id, text: JSON.stringify(object) } });
			target.dispatchEvent(badge_event);
			// To use: Add an event listener on the document for event "badge_click" and match to the id
		});

		badge_close.addEventListener("click", (e) => {
			const target = e.target;
			const badge_event = new CustomEvent("badge_remove", { bubbles: true, detail: { id: obj.id, text: JSON.stringify(object) } });
			target.dispatchEvent(badge_event);
			// To use: Add an event listener on the document for event "badge_remove" and match to the id
			target.parentNode.remove();
		});

		const badge_event = new CustomEvent("badge_add", { bubbles: true, detail: { id: obj.id, text: JSON.stringify(object) } });
		badge.dispatchEvent(badge_event);
		// To use: Add an event listener on the document for event "badge_add" and match to the id

	}

	obj._clear_time_since_last_input = () => {
		obj._time_in_ms_of_last_input = 0;
	}

	obj._clear_timeout = () => {
		if (typeof obj._timeout === "undefined") { return; }
		clearTimeout(obj._timeout);
		obj._timeout = undefined;
	}

	obj._get_time_in_ms_since_last_input = () => {
		if (obj._time_in_ms_of_last_input == 0) { obj._time_in_ms_of_last_input = performance.now(); }
		return performance.now() - obj._time_in_ms_of_last_input;
	}

	obj._immediately_get_badges_from_input = () => {
		obj._time_in_ms_of_last_input = -1 * obj.delay_ms;
		obj.get_badges_from_input();
	}
	
	obj._set_timeout = () => {
		obj._timeout = setTimeout(() => { obj.input.dispatchEvent(new Event("input", { bubbles: true })); }, obj.delay_ms);
	}

	obj._update_time_since_last_input = () => {
		obj._time_in_ms_of_last_input = performance.now();
	}

	/////////////////////////////////////////////////////////////////////////////
	// PUBLIC METHODS ///////////////////////////////////////////////////////////

	obj.add_array_of_badges = (arr) => {
		if (typeof arr === "string") { obj.add_badge(arr); return; }
		if (!Array.isArray(arr)) { obj.add_badge(arr); return; }
		switch (obj.type) {
			case "email": { for (let i = 0; i < arr.length; i++) { obj._add_email_badge(arr[i]); } break; }
			default: { for (let i = 0; i < arr.length; i++) { obj.add_badge(arr[i]); } break; }
		}
		return;
	}

	obj.add_badge = (string_or_object) => {
		if (obj.type === "email") { obj._add_email_badge(string_or_object); return; }
		let object = { };
		if (typeof string_or_object === "string") {
			if (!string_or_object.length) { return; }
			object = { "badge": string_or_object };
		}
		if (typeof string_or_object === "object") { object = string_or_object; }
		if (typeof object !== "object") { return; }
		const badge = document.createElement("div");
		badge.classList.add("badge");
		const keys = Object.keys(object).sort();
		if (!keys.length) { return; }
		for (let i = 0; i < keys.length; i++) { badge.setAttribute("data-" + keys[i], object[keys[i]]); }
		const badge_close = document.createElement("span");
		badge_close.classList.add("badge_close");
		badge_close.innerHTML = '&times;';
		if (keys.includes("badge")) { badge.innerHTML = object.badge; }
		else { badge.innerHTML = object[keys[0]]; }
		badge.appendChild(badge_close);
		obj.badge_area.appendChild(badge);
		obj.remove_duplicate_badges();

		badge.addEventListener("click", (e) => {
			const target = e.target;
			const badge_event = new CustomEvent("badge_click", { bubbles: true, detail: { id: obj.id, text: JSON.stringify(object) } });
			target.dispatchEvent(badge_event);
			// To use: Add an event listener on the document for event "badge_click" and match to the id
		});

		badge_close.addEventListener("click", (e) => {
			const target = e.target;
			const badge_event = new CustomEvent("badge_remove", { bubbles: true, detail: { id: obj.id, text: JSON.stringify(object) } });
			target.dispatchEvent(badge_event);
			// To use: Add an event listener on the document for event "badge_remove" and match to the id
			target.parentNode.remove();
		});

		const badge_event = new CustomEvent("badge_add", { bubbles: true, detail: { id: obj.id, text: JSON.stringify(object) } });
		badge.dispatchEvent(badge_event);
		// To use: Add an event listener on the document for event "badge_add" and match to the id

	}

	obj.export_badges_as_array_of_objects = () => {
		obj._immediately_get_badges_from_input();
		const arr = [];
		const badges = obj.badge_area.getElementsByClassName("badge");
		if (!badges.length) { return []; }
		for (let i = 0; i < badges.length; i++) {
			const badge = element_attributes_to_object(badges[i]);
			console.log(badge);
			arr.push(badge);
		}
		return arr;
	}

	obj.get_badges_from_input = () => {
		obj._clear_timeout();
		const delta_ms = obj._get_time_in_ms_since_last_input();
		obj._update_time_since_last_input();
		if (delta_ms < obj.delay_ms) { obj._set_timeout(); return; }
		let str = obj.input.value;
		const words = obj.parse_string_to_array_of_words(str);
		if (!words.length) { obj._clear_timeout(); obj._clear_time_since_last_input(); return; }
		str = obj.remove_words_from_string(str);
		obj.input.value = str;
		for (let i = 0; i < words.length; i++) {
			const word = words[i];
			switch (obj.type) {
				case "email": {
					if (!is_email(word)) { continue; }
					obj._add_email_badge(word);
					break;
				}
				default: { obj.add_badge(word); break; }
			}
		}
		obj._clear_timeout(); obj._clear_time_since_last_input(); return;
	}

	obj.parse_string_to_array_of_words = (str) => {
		if (typeof str !== "string") { return []; }
		str = str.replace("<", " ");
		str = str.replace(">", " ");
		str = str.replace(/\r\n/g, "\n");
		space_parts = [];
		tab_parts = [];
		comma_parts = [];
		semicolon_parts = [];
		new_line_parts = [];
		if (str.includes(" ")) { space_parts = str.split(" "); }
		if (str.includes("\t")) { tab_parts = str.split("\t"); }
		if (str.includes(",")) { comma_parts = str.split(","); }
		if (str.includes(";")) { semicolon_parts = str.split(";"); }
		if (str.includes("\n")) { new_line_parts = str.split("\n"); }
		let words = [];
		words = words.concat(space_parts);
		words = words.concat(tab_parts);
		words = words.concat(comma_parts);
		words = words.concat(semicolon_parts);
		words = words.concat(new_line_parts);
		words = words.map((x) => { return x.trim(); });
		words = words.filter(x => x);
		words = [...new Set(words)];
		if (!words.length) { words.push(str); }
		return words;
	}

	obj.remove_words_from_string = (words, str) => {
		if (typeof str !== "string") { return ""; }
		if (!Array.isArray(words)) { return str; }
		for (let i = 0; i < words.length; i++) {
			let word = words[i].trim();
			str = str.replace(word, "");
			str = str.replace("<", " ");
			str = str.replace(">", " ");
			str = str.replace("  ", "");
			str = str.replace("\t", "");
			str = str.replace(",", "");
			str = str.replace(";", "");
			str = str.replace(/\r\n/g, "\n");
			str = str.replace("\n", "");
			str = str.trim();
		}
		return str;
	}

	obj.remove_duplicate_badges = () => {
		let str_arr = [];
		const badges = obj.badge_area.getElementsByClassName("badge");
		if (badges.length < 2) { return; }
		for (let i = 0; i < badges.length; i++) {
			str_arr.push(JSON.stringify(element_attributes_to_object(badges[i])));
		}
		str_arr = [...new Set(str_arr)];
		if (str_arr.length === badges.length) { return; }
		obj.badge_area.innerHTML = "";
		for (let i = 0; i < str_arr.length; i++) {
			const new_badge = JSON.parse(str_arr[i]);
			switch (obj.type) {
				case "email": {
					if (!is_email(new_badge)) { continue; }
					obj._add_email_badge(new_badge);
					break;
				}
				default: { obj.add_badge(new_badge); break; }
			}
		}
	}

	obj.set_delay_ms = (delay_ms) => {
		if (typeof delay_ms !== "number") { return; }
		obj.delay_ms = delay_ms;
		return;
	}

	obj.set_personal = (str) => {
		if (typeof str === "string") { obj.personal = str; }
	}

	obj.set_placeholder = (str) => {
		if (typeof str === "string") { input.setAttribute("placeholder", str); }
	}

	obj.set_title = (str) => {
		if (typeof str === "string") { input_label.innerHTML = str; }
	}

	obj.set_type = (str) => {
		if (typeof str !== "string") { return; }
		obj.type = str;
	}

	obj.update_badge = (badge_name, key, value) => {
		if (typeof badge_name !== "string") { return; }
		if (typeof key !== "string") { return; }
		if (typeof value === "undefined") { return; }
		let str_arr = [];
		const badges = obj.badge_area.getElementsByClassName("badge");
		if (!badges.length) { return; }
		for (let i = 0; i < badges.length; i++) {
			const current_badge = element_attributes_to_object(badges[i]);
			if (current_badge.badge === badge_name) { current_badge[key] = value; }
			str_arr.push(JSON.stringify(current_badge));
		}
		str_arr = [...new Set(str_arr)];
		if (str_arr.length !== badges.length) { return; }
		obj.badge_area.innerHTML = "";
		for (let i = 0; i < str_arr.length; i++) {
			const new_badge = JSON.parse(str_arr[i]);
			switch (obj.type) {
				case "email": {
					if (!is_email(new_badge)) { continue; }
					obj._add_email_badge(new_badge);
					break;
				}
				default: { obj.add_badge(new_badge); break; }
			}
		}
	}

	return obj;
}


///////////////////////////////////////////////////////////////////////////////
// core.js

function adhoc_error(message) {
	const error_modal__document = document.getElementById("error_modal__document");
	error_modal__document.innerHTML = '<div class="center">' + message + '</div>'
	show_modal("error_modal");
}

function adhoc_success(message) {
	const success_modal__document = document.getElementById("success_modal__document");
	success_modal__document.innerHTML = '<div class="center">' + message + '</div>'
	show_modal("success_modal");
}

async function api(path, message, header = true) {
	try {
		const options = {
			method: 'POST',
			body: message,
			signal: AbortSignal.timeout(10000) // 10 second timeout
		};
		
		if (header) {
			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded'
			};
		}
		
		const response = await fetch(path, options);
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const text = await response.text();
		return text || true;
		
	} catch (error) {
		if (error.name === 'TimeoutError') {
			console.error('Request timed out');
		} else if (error.name === 'AbortError') {
			console.error('Request was aborted');
		} else {
			console.error('Request failed:', error);
		}
		return false;
	}
}

function capitalize_first_letter(str) {
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function create_modal(size, id) {
	if (typeof size != "string") { size = "small"; }
	if (typeof id != "string") { id = guid(); }
	const obj = {};
	obj.id = id;
	obj.size = size;
	const modal = document.createElement("div");
	modal.id = "modal_" + id;
	modal.classList.add("modal");
	const modal_box = document.createElement("div");
	modal_box.id = "modal_box_" + id;
	modal_box.classList.add("modal_box");
	switch (size) {
		case "small": { modal_box.classList.add("modal_box__small"); break; }
		case "medium": { modal_box.classList.add("modal_box__medium"); break; }
		case "large": { modal_box.classList.add("modal_box__large"); break; }
		case "extra_large": { modal_box.classList.add("modal_box__extra_large"); break; }
		case "full_page": { modal_box.classList.add("modal_box__full_page"); break; }
		default: { modal_box.classList.add("modal_box__medium"); break; }
	}
	const modal_header = document.createElement("div");
	modal_header.id = "modal_header_" + id;
	modal_header.classList.add("modal_header");
	const modal_close = document.createElement("div");
	modal_close.id = "modal_close_" + id;
	modal_close.classList.add("modal_close");
	modal_close.innerHTML = "&times;";
	const modal_title = document.createElement("div");
	modal_title.id = "modal_title_" + id;
	modal_title.classList.add("center");
	const modal_body = document.createElement("div");
	modal_body.id = "modal_body_" + id;
	modal_body.classList.add("modal_body");
	modal.appendChild(modal_box);
	modal_box.appendChild(modal_header);
	modal_header.appendChild(modal_close);
	modal_header.appendChild(modal_title);
	modal_box.appendChild(modal_body);
	obj.element = modal;
	obj.document = modal_body;
	obj.title = modal_title;
	
	// PUBLIC METHODS ///////////////////////////////////////////////////////////
	
	obj.set_document = (str) => {
		if (typeof str !== "string") { return; }
		obj.document.innerHTML = "";
		obj.document.innerHTML = str;	
	}

	obj.set_title = (str) => {
		if (typeof str !== "string") { return; }
		obj.title.innerHTML = str;
	}

	return obj;
}

function create_tooltip(tooltip) {
	if (typeof tooltip !== "string") { return ""; }
	return '<img class="icon tooltip" src="' + current_base_url + '/assets/icons/tooltip_16.png" alt="tooltip" data-tip="' + tooltip + '">';
}

function decode_pipe_encoded_data(str) {
	if (typeof str !== "string") { return undefined; }
	str = str.replace(/\|/g, '"');
	try { return JSON.parse(str); }
	catch { return undefined; }
}

function decode_special(html) {
	const txt = document.createElement("textarea");
	txt.innerHTML = html;
	return txt.value;
}

function decode_quoted_printable(data) {
	// normalise end-of-line signals 
	data = data.replace(/(\r\n|\n|\r)/g, "\n");
	// replace equals sign at end-of-line with nothing
	data = data.replace(/=\n/g, "");
	// encoded text might contain percent signs
	// decode each section separately
	let bits = data.split("%");
	for (let i = 0; i < bits.length; i++) {
		// replace equals sign with percent sign
		bits[i] = bits[i].replace(/=/g, "%");
		// decode the section
		bits[i] = decodeURIComponent(bits[i]);
	}
	// join the sections back together
	return (bits.join("%"));
}


function display_sign_in_timer(minutes, seconds) {
	if (typeof (minutes) === "undefined") { return; }
	if (typeof (seconds) === "undefined") { return; }
	const element = document.getElementById("navbar_signin");
	if (typeof element === "undefined") { return; }
	setTimeout(() => {
		let time = minutes + ":";
		if (seconds < 10) { time += "0"; }
		time += seconds;
		element.innerHTML = time;
		seconds--;
		if (seconds < 0) { seconds = 59; minutes--; }
		if (minutes < 0) {
			element.innerHTML = 'Sign in <span class="caret"></span>';
			element.href = current_base_url + '/signin?from=' + current_page + '&tab=sign_in';
		}
		else { display_sign_in_timer(minutes, seconds); }
	}, 1000);
}

function element_attributes_to_object(element) {
	const obj = {};
	if (typeof element === "undefined") { return obj; }
	const keys = Object.keys(element.dataset).sort();
	if (!keys.length) { return obj; }
	for (let i = 0; i < keys.length; i++) { obj[keys[i].toLowerCase().replace("-", "_")] = element.dataset[keys[i]]; }
	return obj;
}

function encode_special(html) {
	const element = document.createElement("div");
	element.innerText = element.textContent = html;
	const str = element.innerHTML;
	return str;
}

function fix_html(html) {
  html = html.replace(/\n/g, "<br>");
  html = html.replace(/\r/g, "<br>");
  html = html.replace(/\f/g, "<br>");
  html = html.replace(/&013;/g, "<br>");
  html = html.replace(/&#13;/g, "<br>");
  html = html.replace(/&amp;/g, "and");
  html = html.replace(/&nbsp;/g, " ");
  html = html.replace(/&#160;/g, " ");
  html = html.replace(/&lt;/g, "<");
  html = html.replace(/&#60;/g, "<");
  html = html.replace(/&gt;/g, ">");
  html = html.replace(/&#62;/g, ">");
  html = html.replace(/&frasl;/g, "/");
  html = html.replace(/&#47;/g, "/");
  html = html.replace(/&quot;/g, '"');
  html = html.replace(/&#34;/g, '"');
  html = html.replace(/&apos;/g, "'");
  html = html.replace(/&#39;/g, "'");
  html = html.replace(/(^|\W)&(\w+)/g, "");
  return html;
}

function fix_json(json) {
	json = json.replace(/\n/g, "");
	json = json.replace(/\r/g, "");
	json = json.replace(/\f/g, "");
	json = json.replace(/&013;/g, "");
	json = json.replace(/&#13;/g, "");
	json = json.replace(/&amp;/g, "and");
	json = json.replace(/&nbsp;/g, " ");
	json = json.replace(/&#160;/g, " ");
	json = json.replace(/&lt;/g, "<");
	json = json.replace(/&#60;/g, "<");
	json = json.replace(/&gt;/g, ">");
	json = json.replace(/&#62;/g, ">");
	json = json.replace(/&frasl;/g, "/");
	json = json.replace(/&#47;/g, "/");
	json = json.replace(/&quot;/g, '"');
	json = json.replace(/&#34;/g, '"');
	json = json.replace(/&apos;/g, "'");
	json = json.replace(/&#39;/g, "'");
	json = json.replace(/(^|\W)&(\w+)/g, "");
	return json;
}

function fix_text(text) {
	text = text.replace(/&amp;/g, "and");
	text = text.replace(/&nbsp;/g, " ");
	text = text.replace(/&#160;/g, " ");
	text = text.replace(/&lt;/g, "<");
	text = text.replace(/&#60;/g, "<");
	text = text.replace(/&gt;/g, ">");
	text = text.replace(/&#62;/g, ">");
	text = text.replace(/&frasl;/g, "/");
	text = text.replace(/&#47;/g, "/");
	text = text.replace(/&quot;/g, '"');
	text = text.replace(/&#34;/g, '"');
	text = text.replace(/&apos;/g, "'");
	text = text.replace(/&#39;/g, "'");
	text = text.replace(/(^|\W)&(\w+)/g, "");
	return text;
}

function fix_xml(xml) {
  xml = xml.replace(/\n/g, "");
  xml = xml.replace(/\r/g, "");
  xml = xml.replace(/\f/g, "");
  xml = xml.replace(/&013;/g, "");
  xml = xml.replace(/&#13;/g, "");
  xml = xml.replace(/&amp;/g, "and");
  xml = xml.replace(/&nbsp;/g, " ");
  xml = xml.replace(/&#160;/g, " ");
  xml = xml.replace(/&lt;/g, "<");
  xml = xml.replace(/&#60;/g, "<");
  xml = xml.replace(/&gt;/g, ">");
  xml = xml.replace(/&#62;/g, ">");
  xml = xml.replace(/&frasl;/g, "/");
  xml = xml.replace(/&#47;/g, "/");
  xml = xml.replace(/&quot;/g, '"');
  xml = xml.replace(/&#34;/g, '"');
  xml = xml.replace(/&apos;/g, "'");
  xml = xml.replace(/&#39;/g, "'");
  xml = xml.replace(/(^|\W)&(\w+)/g, "");
  return xml;
}

function get_pipe_encoded_data(element_id, data_type) {
	const element = document.getElementById(element_id);
	if (!element) { return []; }
	const encoded = element.getAttribute(data_type);
	let decoded = encoded.replace(/\|/g, '"');
	try { return JSON.parse(decoded); }
	catch { return []; }
}

function get_values_by_id(obj) {
	const keys = Object.keys(obj);
	for (let i = 0; i < keys.length; i++) {
		const id = keys[i];
		const element = document.getElementById(id);
		if (typeof element === "undefined") { continue; }
		if (typeof element?.value === "undefined") { continue; }
		obj[id] = element.value;
	}
	return obj;
}

function guid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

function hide_all_modals() {
	const modal = document.getElementsByClassName("modal");
	if (modal.length) {
		for (var index = 0; index < modal.length; index++) {
			modal[index].style.display = "none";
		}
	}
}

function hide_element_by_id(id) {
	if (typeof id != "string") { return; }
	const element = document.getElementById(id);
	if (!element) { return; }
	element.classList.add("hidden");
	element.classList.add("no_size");
	recursive_hide_element(element);
}

function hide_modal(modal_id) {
	const modal = document.getElementById(modal_id);
	if (modal) { modal.style.display = "none"; }
}

function hide_spinner() { document.getElementById("spinner").style.display = "none"; }

function initialize_tooltips() {
	const tooltips = document.getElementsByClassName("tooltip");
	if (!tooltips.length) { return; }
	for (let i = 0; i < tooltips.length; i++) {
		tooltips[i].addEventListener("click", (e) => {
			e.preventDefault();
			document.getElementById("modal_information").innerHTML = e.target.getAttribute("data-tip");
			show_modal("information_modal");
		});
	}
}

function is_email(email) {
	return email.toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
}

function object_to_form(obj) {
	const form_data = new FormData();
	const keys = Object.keys(obj);
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		let value = obj[key];
		if (typeof value === "object") { value = JSON.stringify(value); }
		form_data.set(key, value);
	}
	return form_data;
}

function password_strength(password) {
	let strength = 0;
	if (password.length >= 8) { strength = password.length; }
	if (password.match(/[a-z]+/)) { strength += 1; } else { return 0; }
	if (password.match(/[A-Z]+/)) { strength += 1; } else { return 0; }
	if (password.match(/[0-9]+/)) { strength += 1; } else { return 0; }
	if (password.match(/[$@#&!]+/)) { strength += 1; }
	strength = Math.round((strength / 11) * 100);
	return strength;
}

async function pause(ms) {
	return new Promise((resolve) => {
		if (typeof (ms) !== "number") { ms = 400; }
		setTimeout(() => { return resolve(); }, ms);
	});
}

function pipe_encode_data(data) {
	let encoded = JSON.stringify(data);
	encoded = encoded.replace(/\"/g, "|");
	return encoded;
}

function recursive_hide_element(element) {
	for (const child of element.children) {
		child.classList.add("hidden");
		child.classList.add("no_size");
		recursive_hide_element(child);
	}
}

function recursive_show_element(element) {
	for (const child of element.children) {
		child.classList.remove("hidden");
		child.classList.remove("no_size");
		recursive_show_element(child);
	}
}

function show_element_by_id(id) {
	if (typeof id != "string") { return; }
	const element = document.getElementById(id);
	if (!element) { return; }
	element.classList.remove("hidden");
	element.classList.remove("no_size");
	recursive_show_element(element);
}

function show_modal(modal_id, hide_all) {
	if (typeof (hide_all) === "undefined") { hide_all = false; }
	if (hide_all) { hide_all_modals(); }
	const modal = document.getElementById(modal_id);
	if (modal) {
		const closeModal = modal.getElementsByClassName("modal_close")[0];
		modal.style.display = "block";
		// close the modal if the user clicks anywhere outside the modal
		closeModal.onclick = function () {
			modal.style.display = "none";
			modal.dispatchEvent(modal_event);
			// To use: Add an event listener on the document for event "modal_close" and match to the id
		}
		window.onclick = function (event) {
			if (event.target == modal) {
				modal.style.display = "none";
				modal.dispatchEvent(modal_event);
				// To use: Add an event listener on the document for event "modal_close" and match to the id
			}
		}
	}
	const modal_event = new CustomEvent("modal_close", { bubbles: true, detail: { id: modal_id } });
}

function strip_tags(str) {
	if (!str) { return ""; }
	return str.replace(/<\/?[^>]+(>|$)/g, "");
}

function show_spinner() { document.getElementById("spinner").style.display = "block"; }

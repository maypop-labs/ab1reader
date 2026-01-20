///////////////////////////////////////////////////////////////////////////////
// editor.js

function create_editor(str) {
	//////////////////////////////////////////////////////////////////////
	// This function creates a a document editor area with associated
	// button panel.
	// An object with the following elements is returned:
	//  editor_obj.element         	<-- the HTML element of the editor
	//	editor_obj.id								<-- the object id
	//////////////////////////////////////////////////////////////////////
	const id = guid();
	const editor = document.createElement("div");
	const panel = document.createElement("div");
	const doc = document.createElement("div");
	const html = document.createElement("textarea");
	editor.classList.add("editor");
	editor.classList.add("form_group");
	panel.classList.add("editor_panel");
	doc.classList.add("editor_document");
	doc.classList.add("overflow_y");
	html.classList.add("editor_html");
	html.classList.add("overflow_y");
	html.classList.add("hidden");

	html.setAttribute("spellcheck", "false");
	html.setAttribute("autocorrect", "off");
	html.setAttribute("autocapitalize", "off");

	doc.setAttribute("contenteditable", true);
	editor.id = id;
	editor.appendChild(panel);
	editor.appendChild(doc);
	editor.appendChild(html);
	const obj = {};
	obj.id = id;
	obj.element = editor;
	obj.document = doc;
	obj.html = html;
	obj.selection = new Range();
	if (str) { obj.document.innerHTML = str; }
	// create the link modal
	obj.link_modal = create_modal("medium", obj.id);
	obj.element.appendChild(obj.link_modal.element);
	obj.link_modal.title.innerHTML = "Create Link";
	
	const link_tile = document.createElement("div");
	link_tile.classList.add("tile");
	link_tile.classList.add("form_container");
	const link_form = document.createElement("form");
	link_form.setAttribute("role", "form");
	
	const link_form_group_text = document.createElement("div");
	link_form_group_text.classList.add("form_group");
	const link_label_text = document.createElement("label");
	link_label_text.setAttribute("for", "link_input_text_" + obj.link_modal.id);
	link_label_text.innerHTML = "Text to display";
	const link_input_text = document.createElement("input");
	link_input_text.id = "link_input_text_" + obj.link_modal.id;
	link_input_text.setAttribute("type", "text");
	link_input_text.setAttribute("spellcheck", "false");
	link_input_text.setAttribute("autocorrect", "off");
	link_input_text.setAttribute("autocapitalize", "off");
	const link_spacer_1 = document.createElement("div");
	link_spacer_1.classList.add("spacer");
	const link_form_group_url = document.createElement("div");
	link_form_group_url.classList.add("form_group");
	const link_label_url = document.createElement("label");
	link_label_url.setAttribute("for", "link_input_url_" + obj.link_modal.id);
	link_label_url.innerHTML = "URL";
	const link_input_url = document.createElement("input");
	link_input_url.id = "link_input_url_" + obj.link_modal.id;
	link_input_url.setAttribute("type", "text");
	link_input_url.setAttribute("spellcheck", "false");
	link_input_url.setAttribute("autocorrect", "off");
	link_input_url.setAttribute("autocapitalize", "off");
	const link_spacer_2 = document.createElement("div");
	link_spacer_2.classList.add("spacer");

	const link_form_group_button_area = document.createElement("div");
	link_form_group_button_area.classList.add("form_group");
	const link_form_group_button_center = document.createElement("div");
	link_form_group_button_center.classList.add("center");
	const link_form_group_button = document.createElement("button");
	link_form_group_button.id = "link_input_button_" + obj.link_modal.id;
	link_form_group_button.innerHTML = "Apply"
	const link_form_hr_1 = document.createElement("hr");
	const link_form_footer = document.createElement("div");
	link_form_footer.classList.add("form_footer");
	const link_form_footer_test_link = document.createElement("label");
	link_form_footer_test_link.id = "test_link_" + obj.link_modal.id;
	link_form_footer_test_link.innerHTML = "Test link?"
	link_tile.appendChild(link_form);
	
	link_form.appendChild(link_form_group_text);
	link_form_group_text.appendChild(link_label_text);
	link_form_group_text.appendChild(link_input_text);
	link_form.appendChild(link_spacer_1);
	link_form.appendChild(link_form_group_url);
	link_form_group_url.appendChild(link_label_url);
	link_form_group_url.appendChild(link_input_url);
	link_form.appendChild(link_spacer_2);
	link_form.appendChild(link_form_group_button_area);
	link_form_group_button_area.appendChild(link_form_group_button_center);
	link_form_group_button_center.appendChild(link_form_group_button);
	link_form.appendChild(link_form_hr_1);
	link_form.appendChild(link_form_footer);
	link_form_footer.appendChild(link_form_footer_test_link);
	
	obj.link_modal.document.appendChild(link_tile);

	link_form_group_button.addEventListener("click", (e) => {
		e.preventDefault();
		const link_text = document.getElementById("link_input_text_" + obj.link_modal.id)?.value || "";
		const link_url = document.getElementById("link_input_url_" + obj.link_modal.id)?.value || "";
		if (!link_url.length) { return; }
		obj.document.focus();
		document.execCommand('insertHTML', false, '<a href="' + link_url + '">' + link_text + '</a>');
		hide_modal(obj.link_modal.element.id);
	});

	link_form_footer_test_link.addEventListener("click", () => {
		const link_url = document.getElementById("link_input_url_" + obj.link_modal.id)?.value || "";
		if (link_url.length) { const new_tab = window.open(link_url, "_BLANK"); new_tab.focus(); }
	});

	// setup editor buttons
	const btn_names = [
		"bold",
		"italic",
		"underline",
		"strikethrough",
		"subscript",
		"superscript",
		"eraser",
		"align-left",
		"align-center",
		"align-right",
		"align-justify",
		"outdent",
		"indent",
		"list-ul",
		"list-ol",
		"link",
		"unlink",
		//"picture-o",
		"code",
		"paint-brush"
	];

	// add basic document functionality
	obj.document.addEventListener("focusout", () => { obj.selection = save_selection(); });
	obj.document.addEventListener("focusin", () => { restore_selection(obj.selection); });

	// create the editor buttons
	const btns = new Array(btn_names.length);
	for (let i = 0; i < btns.length; i++) {
		btns[i] = document.createElement("i");
		btns[i].classList.add("fa");
		btns[i].classList.add("fa-" + btn_names[i]);
		btns[i].classList.add("editor_panel__button");
		btns[i].setAttribute("data-name", btn_names[i]);
		btns[i].setAttribute("data-target", id);
		panel.appendChild(btns[i]);
		btns[i].addEventListener("click", (e) => {
			const event = new CustomEvent(id, { bubbles: true, detail: { id: id, button: btn_names[i] } });
			e.target.dispatchEvent(event);
		});
	}
	// hidden buttons: color picker
	const color_picker = document.createElement("input");
	color_picker.setAttribute("type", "color");
	color_picker.setAttribute("value", "#000000");
	color_picker.id = "color-picker-" + id;
	color_picker.style.borderBottom = "none";
	color_picker.style.height = "0px";
	color_picker.style.margin = "0px";
	color_picker.style.padding = "none";
	color_picker.style.visibility = "hidden";
	color_picker.style.width = "0px";
	panel.appendChild(color_picker);
	color_picker.addEventListener("change", (e) => {
		obj.document.focus();
		document.execCommand('styleWithCSS', false, true);
		document.execCommand('foreColor', false, e.target.value);
	});

	obj.element.addEventListener(id, (e) => {
		obj.document.focus();

		switch (e.detail.button) {
			case "bold": { document.execCommand("bold", false, null); break; }
			case "italic": { document.execCommand("italic", false, null); break; }
			case "underline": { document.execCommand("underline", false, null); break; }
			case "strikethrough": { document.execCommand("strikethrough", false, null); break; }
			case "subscript": { document.execCommand("subscript", false, null); break; }
			case "superscript": { document.execCommand("superscript", false, null); break; }
			case "eraser": { document.execCommand("removeFormat", false, null); break; }
			case "align-left": { document.execCommand("justifyLeft", false, null); break; }
			case "align-center": { document.execCommand("justifyCenter", false, null); break; }
			case "align-right": { document.execCommand("justifyRight", false, null); break; }
			case "align-justify": { document.execCommand("justifyFull", false, null); break; }
			case "outdent": { document.execCommand("outdent", false, null); break; }
			case "indent": { document.execCommand("indent", false, null); break; }
			case "list-ul": { document.execCommand("insertUnorderedList", false, null); break; }
			case "list-ol": { document.execCommand("insertOrderedList", false, null); break; }
			case "link": { 
				show_modal(obj.link_modal.element.id);
				const link_input_text = document.getElementById("link_input_text_" + obj.link_modal.id);
				if (typeof link_input_text === "undefined") { break; } 
				if (typeof obj.selection === "undefined") { break; }
				const selection = obj.selection.toString() || "";
				link_input_text.value = selection;
				break;
			}
			case "unlink": {
				if (typeof obj.selection != "object") { break; }
				if (obj.selection?.[0]?.startContainer?.parentNode?.tagName === "A" || obj.selection?.[0]?.endContainer?.parentNode?.tagName === "A") {
					const link_text = obj.selection.toString() || "";
					document.execCommand('insertHTML', false, "<span>" + link_text + "</span>");
				}
				break;
			}
			case "picture-o": { break; }
			case "code": {
				if (obj.html.classList.contains("hidden")) { obj.html.innerHTML = obj.document.innerHTML; }
				if (obj.document.classList.contains("hidden")) { obj.document.innerHTML = obj.html.value; }
				obj.document.classList.toggle("hidden");
				obj.html.classList.toggle("hidden");
				obj.document.blur();
				obj.html.blur();
				clearSelection();
				break;
			}
			case "paint-brush": {
				const color_picker = document.getElementById("color-picker-" + id);
				color_picker.click();
				break;
			}
			default: { break; }
		}
	});

	function clearSelection() {
		const sel = document.selection
		if (sel?.empty) { sel.empty(); }
		else {
			if (window.getSelection) { window.getSelection().removeAllRanges(); }
			const activeEl = document.activeElement;
			if (activeEl) {
				var tagName = activeEl.nodeName.toLowerCase();
				if (tagName == "textarea" || (tagName == "input" && activeEl.type == "text")) {
					// Collapse the selection to the end
					activeEl.selectionStart = activeEl.selectionEnd;
				}
			}
		}
	}

	function save_selection() {
		// check to see if any text is selected
		if (window.getSelection) {
			// get the selected text
			const sel = window.getSelection();
			// check to see if the selection is more than just the caret
			if (sel.getRangeAt && sel.rangeCount) {
				const ranges = [];
				for (let i = 0, len = sel.rangeCount; i < len; ++i) { ranges.push(sel.getRangeAt(i)); }
				// return the selected text
				return ranges;
			}
		}
		else if (document.selection && document.selection.createRange) { return document.selection.createRange(); }
		return undefined;
	}

	function restore_selection(savedSel) {
		// check to see if selected text was saved
		if (savedSel) {
			if (window.getSelection) {
				sel = window.getSelection();
				sel.removeAllRanges();
				for (var i = 0, len = savedSel.length; i < len; ++i) { sel.addRange(savedSel[i]); }
			}
			else if (document.selection && savedSel.select) { savedSel.select(); }
		}
	}

	obj.export_as_file = () => {
		const html_blob = new Blob([obj.document.innerHTML], { type: "text/plain;charset=utf-8" });
		return new File([html_blob], "html.txt");
	}

	return obj;
}
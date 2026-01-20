///////////////////////////////////////////////////////////////////////////////
// image_selector.js

function create_image_selector() {

	// global variables
	const obj = {};
	const id = "image_selector_" + guid();
	const modal = document.createElement("div");
	const modal_box = document.createElement("div");
	const modal_header = document.createElement("div");
	const modal_header_close = document.createElement("span");
	const modal_header_title = document.createElement("div");
	const modal_form = document.createElement("form");
	const modal_form_center = document.createElement("div");
	const modal_form_form_group = document.createElement("div");
	const modal_form_upload_button = document.createElement("button");
	const modal_hr = document.createElement("hr");
	const modal_image_selector_container = document.createElement("div");

	// DOM construction
	modal.id = id;
	modal.classList.add("modal");
	modal_box.classList.add("modal_box");
	modal_box.classList.add("modal_box__large");
	modal_header.classList.add("modal_header");
	modal_header_close.classList.add("modal_close");
	modal_header_title.classList.add("center");
	modal_form_center.classList.add("center");
	modal_form_form_group.classList.add("form_group");
	modal_image_selector_container.classList.add("image_selector_container");
	modal_image_selector_container.classList.add("overflow_y");
	modal.setAttribute("data-number-of-images", 0);
	modal_header_close.innerHTML = "&times;";
	modal_form_upload_button.innerHTML = "&nbsp;+&nbsp;Upload&nbsp;Image";
	modal_header_title.innerHTML = "Select an Image";

	// put it all together
	modal.appendChild(modal_box);
	modal_box.appendChild(modal_header);
	modal_header.appendChild(modal_header_close);
	modal_header.appendChild(modal_header_title);
	modal_box.appendChild(modal_form);
	modal_form.appendChild(modal_form_center);
	modal_form_center.appendChild(modal_form_form_group);
	modal_form_form_group.appendChild(modal_form_upload_button);
	modal_box.appendChild(modal_hr);
	modal_box.appendChild(modal_image_selector_container);

	// hidden image upload form
	const modal_upload_form = document.createElement("form");
	const modal_upload_form_tag_input = document.createElement("input");
	const modal_upload_form_file_input = document.createElement("input");
	modal_upload_form.classList.add("data_only");
	modal_upload_form.setAttribute("method", "post");
	modal_upload_form.setAttribute("enctype", "multipart/form-data");
	modal_upload_form_tag_input.type = "hidden";
	modal_upload_form_tag_input.name = "tag";
	modal_upload_form_tag_input.value = "";
	modal_upload_form_file_input.type = "file";
	modal_upload_form_file_input.name = "file";
	modal_upload_form_file_input.accept = "image/jpg, image/jpeg, image/png, image/gif, image/bmp";
	modal_upload_form.appendChild(modal_upload_form_tag_input);
	modal_upload_form.appendChild(modal_upload_form_file_input);
	modal_box.appendChild(modal_upload_form);

	// object constructor
	obj._container = modal_image_selector_container;
	obj._media_array = [];
	obj._tag = "";
	obj._tag_for_upload = modal_upload_form_tag_input;
	obj._upload_button = modal_form_upload_button;
	obj._hidden_form = modal_upload_form;
	obj._hidden_upload_button = modal_upload_form_file_input;
	obj.element = modal;
	obj.id = id;
	obj.selected_image = { };

	/////////////////////////////////////////////////////////////////////////////
	// EVENT LISTENERS //////////////////////////////////////////////////////////

	obj._upload_button.addEventListener("click", (e) => {
		e.preventDefault();
		obj._hidden_upload_button.click();
	});

	obj._hidden_form.addEventListener("change", async (e) => {
		e.preventDefault();
		let target = e.target;
		if (target.tagName.toLowerCase() === "input") { target = target.parentNode; }
		show_spinner();
		const form = new FormData(target);
		console.log(form);
		const response = JSON.parse(await api(current_base_url + '/auth/image_upload', form, false));
		hide_spinner();
		if (typeof response === "boolean") { return; }
		if (response?.errors) { hide_all_modals(); adhoc_error(error_codes[response.error_code]); return; }
		obj.get_images_by_tag();
	});

	/////////////////////////////////////////////////////////////////////////////
	// PRIVATE METHODS //////////////////////////////////////////////////////////

	obj._add_images_to_container = (media_array) => {
		if (!Array.isArray(media_array)) { media_array = obj._media_array; }
		for (let i = 0; i < media_array.length; i++) {
			const image = document.createElement("img");
			const image_area = document.createElement("div");
			const image_container = document.createElement("div");
			const image_name_container = document.createElement("div");
			const image_name = document.createElement("a");
			image_container.classList.add("image_128_container");
			image_container.setAttribute("data-media", pipe_encode_data(media_array[i]));
			image_name_container.classList.add("image_selector_name_container");
			image_name.classList.add("link");
			image_name.href = '#';
			image_name.setAttribute("data-link", current_base_url + '/apps/image_viewer/editor?mediaID=' + media_array[i].mediaID);
			if (media_array[i].title) {	image_name.innerHTML = media_array[i].title; }
			else { image_name.innerHTML = "View"; }
			image.src = current_base_url + '/media/' + media_array[i].file_name + '_128.jpg' + '?' + new Date().getTime();
			image.alt = "user uploaded image";
		
			image_container.appendChild(image);
			image_name_container.appendChild(image_name);
			image_area.appendChild(image_container);
			image_area.appendChild(image_name_container);
			obj._container.appendChild(image_area);
			image_area.addEventListener("click", (e) => {
				e.preventDefault();
				let target = e.target;
				if (target.tagName.toLowerCase() === "img") { target = target.parentNode; }
				obj.selected_image = decode_pipe_encoded_data(target.getAttribute("data-media"));
				const event = new CustomEvent("image_selected", { bubbles: true, detail: { id: obj.id, media: obj.selected_image } });
				target.dispatchEvent(event);
				// To use: Add an event listener on the document for event "image_selected"
				hide_modal(obj.id);
			});

			image_name.addEventListener("click", (e) => {
				e.preventDefault();
				const source = image_name.getAttribute("data-link");
				window.open(source, "_blank");
			});

		}
	}

	obj._clear_container = () => {
		if (obj._container?.innerHTML) { obj._container.innerHTML = ""; } 
	}

	/////////////////////////////////////////////////////////////////////////////
	// PUBLIC METHODS ///////////////////////////////////////////////////////////

	obj.get_images_by_tag = async (tag) => {
		const path = current_base_url + '/auth/image_selector';
		if (typeof tag === "undefined") { tag = obj._tag; }
		if (typeof tag !== "string") { return; }
		let message = 'command=get_images_by_tag';
		message += '&tag=' + tag;
		show_spinner();
		const response = JSON.parse(await api(path, message));
		hide_spinner();
		if (typeof response == "boolean") { return; }
		obj._media_array = response?.data;
		obj._clear_container();
		obj._add_images_to_container();
	}

	obj.hide = () => { hide_modal(obj.id); }

	obj.set_tag = (tag) => {
		if (typeof tag !== "string") { return; }
		obj._tag = tag;
		obj._tag_for_upload.value = tag;
	}

	obj.show = () => { show_modal(obj.id); }

	/////////////////////////////////////////////////////////////////////////////
	return obj;

}

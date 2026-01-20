///////////////////////////////////////////////////////////////////////////////
// image_tray.js

function create_image_tray() {

	// global variables
	const obj = {};
	const id = "image_tray_" + guid();

	// DOM construction
	const everything = document.createElement("div");
	const container = document.createElement("div");
	const center = document.createElement("div");
	const spacer = document.createElement("div");
	const button = document.createElement("button");
	const image_selector_container = document.createElement("div");
	button.innerHTML = "Add Image";

	// css classes
	container.classList.add("image_tray__container");
	container.classList.add("overflow_y");
	spacer.classList.add("spacer");
	center.classList.add("center");
	
	// put it all together
	everything.appendChild(container);
	everything.appendChild(spacer);
	everything.appendChild(center);
	center.appendChild(button);
	everything.appendChild(image_selector_container);
	
	// private member variables
	obj._button = button;
	obj._image_container = container;
	obj._image_selector = create_image_selector();
	obj._image_selector_container = image_selector_container;
	obj._size = "128";
	// public member variables
	obj.element = everything;
	obj.id = id;

	obj._image_selector_container.appendChild(obj._image_selector.element);

	/////////////////////////////////////////////////////////////////////////////
	// PRIVATE METHODS //////////////////////////////////////////////////////////

	obj._format_image_for_html = (media) => {
		const container = document.createElement("div");
		if (typeof media !== "object") { return container; }
		const image = document.createElement("img");
		const close = document.createElement("span");
		container.classList.add("img-" + obj._size);
		container.classList.add("image_tray__image_container");
		close.classList.add("image_tray_close");
		close.innerHTML = "&times;";
		image.src = current_base_url + '/media/' + media.file_name + '_' + obj._size + '.jpg' + '?' + new Date().getTime();
		image.alt = "Image";
		image.setAttribute("data-media", pipe_encode_data(media));
		switch (media.orientation) {
			case "landscape": { image.classList.add("img-landscape"); break; }
			case "portrait": { image.classList.add("img-portrait"); break; }
			case "square": { image.classList.add("img-square"); break; }
			default: { image.classList.add("img-square"); break; }
		}
		container.appendChild(image);
		container.appendChild(close);

		close.addEventListener("click", (e) => {
			e.preventDefault();
			const parent_image = e.target.parentNode;
			const parent_container = parent_image.parentNode;
			parent_container.removeChild(parent_image);
		});

		return container;
	}

	/////////////////////////////////////////////////////////////////////////////
	// PUBLIC METHODS ///////////////////////////////////////////////////////////

	obj.add_array_of_media = (arr) => {
		if (!Array.isArray(arr)) { return; }
		obj._image_container.innerHTML = "";
		for (let i = 0; i < arr.length; i++) {
			const image = obj._format_image_for_html(arr[i]);
			obj._image_container.appendChild(image);
		}
	}

	obj.export_as_array_of_mediaIDs = () => {
		const arr = [];
		const images = obj._image_container.querySelectorAll("img");
		for (let i = 0; i < images.length; i++) {
			const medium = decode_pipe_encoded_data(images[i].getAttribute("data-media"));
			arr.push(medium?.mediaID);
		}
		return arr;
	}

	obj.export_as_array_of_objects = () => {
		const arr = [];
		const images = obj._image_container.querySelectorAll("img");
		for (let i = 0; i < images.length; i++) {
			arr.push(decode_pipe_encoded_data(images[i].getAttribute("data-media")));
		}
		return arr;
	}

	obj.set_size = (size) => {
		const sizes = ["512", "256", "128", "64", "32", "24", "16"];
		if (typeof size === "undefined") { size = "128"; }
		if (typeof size !== "string") { size = size.toString(); }
		if (size === "") { size = "128"; }
		if (!sizes.includes(size)) { size = "128"; }
		obj._size = size;
	}

	obj.set_tag = (tag) => { obj._image_selector.set_tag(tag); }

	/////////////////////////////////////////////////////////////////////////////
	// EVENT LISTENERS //////////////////////////////////////////////////////////

	obj._button.addEventListener("click", async (e) => {
		e.preventDefault();
		obj._image_selector.get_images_by_tag();
		obj._image_selector.show();
	});

	// event listener for the image selector
	document.addEventListener("image_selected", (e) => {
		const id = e.detail.id;
		const media = e.detail.media;
		if (id !== obj._image_selector.id) { return; }
		const image = obj._format_image_for_html(media);
		obj._image_container.appendChild(image);
	});

	/////////////////////////////////////////////////////////////////////////////
	// RETURN ///////////////////////////////////////////////////////////////////

	return obj;

}
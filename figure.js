///////////////////////////////////////////////////////////////////////////////
// figure.js

///////////////////////////////////////////////////////////////////////////////
// PART 1: CANVAS ELEMENTS ////////////////////////////////////////////////////

function CIRCLE_STYLE() {
	this.color = 'white';
	this.line_color = 'black';
	this.line_width = 3;
	this.shadow_color = 'black';
	this.shadow_blur = 20;

	this.clone = () => {
		const c = new CIRCLE_STYLE();
		c.color = this.color;
		c.line_color = this.line_color;
		c.line_width = this.line_width;
		c.shadow_color = this.shadow_color;
		c.shadow_blur = this.shadow_blur;
		return c;
	}

	this.set_color = (color) => {
		if (typeof(color) !== 'string') { return; }
		this.color = color;
		this.shadow_color = color;
	}

	this.set_glow = (glow) => {
		if (typeof (glow) !== 'number') { return; }
		this.shadow_blur = glow;
	}

	this.set_line_width = (line_width) => {
		this.line_width = line_width;
	}

	this.set_style = (style) => {
		if (typeof (style) !== 'object') { return; }
		this.color = style.color;
		this.line_color = style.line_color;
		this.line_width = style.line_width;
		this.shadow_color = style.shadow_color;
		this.shadow_blur = style.shadow_blur;
	}

}

function CIRCLE(context, x, y, radius, style) {
	this.context = context;
	this.end_angle = 2 * Math.PI;
	this.radius = radius || 10;
	this.start_angle = 0;
	this.style = style || new CIRCLE_STYLE();
	this.x = x || Math.floor(Math.random() * 100000) - 50000;
	this.y = y || Math.floor(Math.random() * 100000) - 50000;

	this.is_visible = () => {
		const width = this.context.canvas.width;
		const height = this.context.canvas.height;
		if (this.x < (0 - this.radius)) { return false; }
		if (this.x > (width + this.radius)) { return false; }
		if (this.y < (0 - this.radius)) { return false; }
		if (this.y > (height + this.radius)) { return false; }
		return true;
	}
	
	this.draw = (new_style) => {
		new_style = new_style || this.style;
		this.context.fillStyle = new_style.color || this.style.color;
		this.context.lineWidth = new_style.line_width || this.style.line_width;
		this.context.shadowBlur = new_style.shadow_blur || this.style.shadow_blur;
		this.context.shadowColor = new_style.shadow_color || this.style.shadow_color;
		this.context.strokeStyle = new_style.line_color || this.style.line_color;
		this.context.beginPath();
		this.context.arc(this.x, this.y, this.radius, this.start_angle, this.end_angle);
		this.context.fill();
		this.context.stroke();
	}

}

function LINE_STYLE() {
	this.color = 'rgb(49.4, 73.3, 92.9, 0.5)';
	this.line_width = 2;
	this.shadow_color = 'transparent';
	this.shadow_blur = 0;

	this.clone = () => {
		const c = new LINE_STYLE();
		c.color = this.color;
		c.line_width = this.line_width;
		c.shadow_color = this.shadow_color;
		c.shadow_blur = this.shadow_blur;
		return c;
	}

	this.set_color = (color) => {
		this.color = color;
		this.shadow_color = color;
	}

	this.set_glow = (glow) => {
		this.shadow_blur = glow;
	}

	this.set_line_width = (line_width) => {
		this.line_width = line_width;
	}

	this.set_style = (style) => {
		this.color = style.color;
		this.line_width = style.line_width;
		this.shadow_color = style.shadow_color;
		this.shadow_blur = style.shadow_blur;
	}

}

function LINE(context, x0, y0, x1, y1, style) {

	this.context = context;
	this.style = style || new LINE_STYLE();
	this.x0 = x0 || Math.floor(Math.random() * 10000) - 5000;
	this.y0 = y0 || Math.floor(Math.random() * 10000) - 5000;
	this.x1 = x1 || x0 + Math.floor(Math.random() * 100) - 50;
	this.y1 = y1 || y0 + Math.floor(Math.random() * 100) - 50;

	this.draw = (new_style) => {
		new_style = new_style || this.style;
		this.context.lineWidth = new_style.line_width || this.style.line_width;
		this.context.shadowColor = new_style.shadow_color || this.style.shadow_color;
		this.context.shadowBlur = new_style.shadow_blur || this.style.shadow_blur;
		this.context.strokeStyle = new_style.color || this.style.line_color;
		this.context.beginPath();
		this.context.moveTo(this.x0, this.y0);
		this.context.lineTo(this.x1, this.y1);
		this.context.stroke();
	}

}

function MOUSE(canvas) {

	this.canvas = canvas || undefined;
	this.left_button_is_down = false;
	this.right_button_is_down = false;
	this.x = 0;
	this.y = 0;

	document.addEventListener('mousedown', get_mouse_button_state.bind(this), false);
	document.addEventListener('mousemove', get_mouse_movement.bind(this), false);
	document.addEventListener('mouseup', get_mouse_button_state.bind(this), false);

	this.is_over_canvas = () => {
		if (canvas) {
			if (this.x >= 0 && this.x <= this.canvas.width) {
				if (this.y >= 0 && this.y <= this.canvas.height) { return true; }
			}
		}
		return false;
	}

	function get_mouse_button_state(e) {
		switch (e.type) {
			case 'mousedown': {
				if (e.button === 0) { this.left_button_is_down = true; }
				if (e.button === 2) { this.right_button_is_down = true; }
				break;
			}
			case 'mouseup': {
				if (e.button === 0) { this.left_button_is_down = false; }
				if (e.button === 2) { this.right_button_is_down = false; }
				break;
			}
		}
		return;
	}

	function get_mouse_movement(e) {
		this.x = e.x;
		this.y = e.y;
		if (canvas) {
			const rect = canvas.getBoundingClientRect();
			this.x = Math.round(e.x - rect.left);
			this.y = Math.round(e.y - rect.top);
		}
	}

}

///////////////////////////////////////////////////////////////////////////////
// PART 2: DATA STRUCTURES ////////////////////////////////////////////////////

function NETWORK_RECORD(context, node) {
	this.context = context;
	this.lines = [];
	this.node = node; // this element is expected to be a NODE object from graph.js
	this.circle = new CIRCLE(this.context, node.x, node.y, node.radius);

	this.display_name = () => {
		const name = this.node.name || '?';
		let alpha = (this.circle.radius - 10) / 15;
		alpha = Math.min(Math.max(alpha, 0.0), 1.0).toFixed(2);
		const font_size = Math.floor(this.circle.radius * 1.33).toString();
		this.context.font = 'bold ' + font_size + 'px Calibri';
		this.context.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
		this.context.shadowBlur = 10;
		this.context.shadowColor = 'rgba(0, 0, 0, ' + alpha + ')';
		this.context.textAlign = 'center';
		this.context.textBaseline = 'middle';
		this.context.fillText(name, this.circle.x, this.circle.y);
	}

	this.get_circle_style = () => {
		// Returns the defaults circle style for network figures.
		//	Change these values to change the default way that
		//	circles are displayed.
		const cs = new CIRCLE_STYLE();
		cs.set_color('#7ebbed');
		cs.set_glow(10);
		cs.line_color = 'transparent';
		return cs;
	}

	this.get_line_style = () => {
		// Returns the default line style for network figures.
		//	Change these values to change the dafault way that
		//	lines are displayed.
		const ls = new LINE_STYLE();
		ls.color = 'rgb(49.4, 73.3, 92.9, 0.5)';
		ls.line_width = 2;
		ls.shadow_color = 'transparent';
		ls.shadow_blur = 0;
		return ls;
	}

	this.offset_coordinates = (x, y) => {
		x = x || 0;
		y = y || 0;
		this.node.x += x;
		this.node.y += y;
		this.circle.x += x;
		this.circle.y += y;
	}

	this.scale_coordinates = (scale) => {
		scale = scale || 1.0;
		this.node.x = Math.round(this.node.x * scale);
		this.node.y = Math.round(this.node.y * scale);
		this.circle.x = Math.round(this.circle.x * scale);
		this.circle.y = Math.round(this.circle.y * scale);
	}

	this.set_coordinates = (x, y) => {
		x = x || 0;
		y = y || 0;
		this.node.x = x;
		this.node.y = y;
		this.circle.x = x;
		this.circle.y = y;
	}

	this.circle.style.set_style(this.get_circle_style());
	if (this.node.edges.length) {
		for (let i = 0; i < this.node.edges.length; i++) {
			const line = new LINE(this.context, this.node.x, this.node.y, this.get_line_style());
			this.lines.push(line);
		}
	}

}

///////////////////////////////////////////////////////////////////////////////
// PART 3: THE FIGURE OBJECT //////////////////////////////////////////////////

function FIGURE() {

	this.NETWORK = function (json, html_element) {
		
		this.cargo = [];

		// canvas
		this.canvas = document.createElement('canvas');
		this.canvas.width = document.body.clientWidth;
		this.canvas.height = document.body.clientHeight;
		if (html_element) {
			this.canvas.width = html_element.clientWidth;
			this.canvas.height = html_element.clientHeight;
			html_element.innerHTML = '';
			html_element.append(this.canvas);
		}
		const context = this.canvas.getContext('2d');

		// actions
		const mouse = new MOUSE(this.canvas);
		const drag = { index: -1, state: false }
		const highlight = { index: -1, state: false, targets: [] }
		const pan = { start_x: 0, start_y: 0, state: false, x: 0, y: 0 }
		
		
		// create the records
		if (json) {
			const nodes = JSON.parse(json);
			for (let i = 0; i < nodes.length; i++) {
				const record = new NETWORK_RECORD(context, nodes[i]);
				this.cargo.push(record);
			}
		}
		
		// styles
		const cs_highlight0 = this.cargo[0].get_circle_style();
		const cs_highlight1 = this.cargo[0].get_circle_style();
		const cs_highlight2 = this.cargo[0].get_circle_style();
		const ls_highlight1 = this.cargo[0].get_line_style();
		cs_highlight0.set_color('#ffa300');
		cs_highlight1.set_color('#c90e8f');
		cs_highlight2.set_color('#ff89ef');
		ls_highlight1.set_color('#c90e8f');
		ls_highlight1.set_line_width(); // use default
		cs_highlight0.set_glow(30);
		cs_highlight1.set_glow(30);
		cs_highlight2.set_glow(30);

		///////////////////////////////////////////////////////////////////////////
		// PUBLIC METHODS /////////////////////////////////////////////////////////

		this.center = (node) => {
			const offset = centroid();
			if (node) {
				offset.x = node.x;
				offset.y = node.y;
			}
			const origin = { x: 0, y: 0 };
			origin.x = this.canvas.width / 2;
			origin.y = this.canvas.height / 2;
			const delta_x = origin.x - offset.x;
			const delta_y = origin.y - offset.y;
			for (let i = 0; i < this.cargo.length; i++) {
				this.cargo[i].node.x += delta_x;
				this.cargo[i].node.y += delta_y;
				this.cargo[i].circle.x += delta_x;
				this.cargo[i].circle.y += delta_y;
				for (let j = 0; j < this.cargo[i].lines.length; j++) {
					this.cargo[i].lines[j].x0 += delta_x;
					this.cargo[i].lines[j].y0 += delta_y;
					this.cargo[i].lines[j].x1 += delta_x;
					this.cargo[i].lines[j].y1 += delta_y;
				}
			}
			draw();
		}

		///////////////////////////////////////////////////////////////////////////
		// PRIVATE METHODS ////////////////////////////////////////////////////////

		const centroid = () => {
			const mean = { x: 0, y: 0 }
			if (!this.cargo.length) { return mean; }
			for (let i = 0; i < this.cargo.length; i++) {
				mean.x += this.cargo[i].node.x;
				mean.y += this.cargo[i].node.y;
				}
			mean.x /= this.cargo.length;
			mean.y /= this.cargo.length;
			return mean;
		}

		const draw = () => {
			
			context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			// draw lines
			for (let i = 0; i < this.cargo.length; i++) {
				if (!highlight.state || highlight.index !== i) {
					for (let j = 0; j < this.cargo[i].lines.length; j++) { this.cargo[i].lines[j].draw(); }
				}
			}
			// draw highlighted lines
			for (let i = 0; i < this.cargo.length; i++) {
				if (highlight.state && highlight.index === i) {
					for (let j = 0; j < this.cargo[i].lines.length; j++) { this.cargo[i].lines[j].draw(ls_highlight1); }
				}
			}
			// draw circles
			for (let i = 0; i < this.cargo.length; i++) {
				if (this.cargo[i].node.highlight) { this.cargo[i].circle.draw(cs_highlight0); }
				else if (highlight.targets.includes(i)) { this.cargo[i].circle.draw(cs_highlight2); }
				else if (highlight.state && highlight.index === i) { this.cargo[i].circle.draw(cs_highlight1); }
				else { this.cargo[i].circle.draw(); }
				if (this.cargo[i].circle.radius >= 10) { this.cargo[i].display_name(); }
			}
		}

		const is_mouse_over_circle = (circle) => {
			const delta_x = mouse.x - circle.x;
			const delta_y = mouse.y - circle.y;
			return (delta_x * delta_x) + (delta_y * delta_y) <= (circle.radius * circle.radius);
		}

		const mouse_button = (e) => {
			if (!mouse.is_over_canvas()) { return; }
			switch (e.type) {
				case 'mousedown': {
					// check to see if the mouse if over a circle
					for (let i = 0; i < this.cargo.length; i++) {
						if (this.cargo[i].circle.is_visible()) {
							if (is_mouse_over_circle(this.cargo[i].circle)) {
								drag.index = i;
								drag.state = true;
								highlight.index = i;
								highlight.state = true;
								highlight.targets = [];
								for (let j = 0; j < this.cargo[i].node.edges.length; j++) {
									highlight.targets.push(this.cargo[i].node.edges[j].target_index);
								}
								pan.index = -1;
								pan.state = false;
								draw();
								return;
							}
						}
					}
					// the mouse is not over a circle
					if (!pan.state) {
						pan.state = true;
						pan.start_x = mouse.x;
						pan.start_y = mouse.y;
						pan.x = mouse.x;
						pan.y = mouse.y;
					}
					break;
				}
				case 'mouseup': {
					if (drag.state) { drag.index = -1; drag.state = false; }
					if (highlight.index === -1) { highlight.state = false; }
					if (pan.state) {
						pan.state = false;
						// check to see if the canvas was only clicked, and not dragged
						const delta_x = mouse.x - pan.start_x;
						const delta_y = mouse.y - pan.start_y;
						if (delta_x + delta_y === 0) {
							highlight.index = -1;
							highlight.state = false;
							highlight.targets = [];
						}
					}
					draw();
					break;
				}
			}
			return;
		}

		const mouse_move = () => {
			// Check to see that the mouse is over the canvas and
			//	the left mouse button is down
			if (!mouse.is_over_canvas()) { return; }
			if (!mouse.left_button_is_down) {	return; }

			// The left mouse button is down.
			// check to see if any circle should be dragged
			if (drag.state) {
				if (drag.index > -1 && !this.cargo[drag.index].node.locked) {
					this.cargo[drag.index].set_coordinates(mouse.x, mouse.y);
					update_lines();
					draw();
				}
				return;
			}
			// No circle is currently being dragged.
			// Check to see if the viewport should be panned
			if (pan.state) {
				const delta_x = mouse.x - pan.x;
				const delta_y = mouse.y - pan.y;
				for (let i = 0; i < this.cargo.length; i++) {
					this.cargo[i].offset_coordinates(delta_x, delta_y);
				}
				update_lines();
				draw();
				pan.x = mouse.x;
				pan.y = mouse.y;
			}
		}

		const mouse_zoom = (e) => {
			if (!mouse.is_over_canvas()) { return; }
			const zoom = e.deltaY;
			const zoom_delta = 0.05;
			const zoom_in = 1.00 + zoom_delta;
			const zoom_out = 1.00 - zoom_delta;
			let scale = 1.00;
			if (zoom < 0) { scale = zoom_in; }
			else { scale = zoom_out; }
			for (let i = 0; i < this.cargo.length; i++) {
				let delta_x = (this.cargo[i].circle.x - mouse.x) * scale;
				let delta_y = (this.cargo[i].circle.y - mouse.y) * scale;
				this.cargo[i].set_coordinates(mouse.x + delta_x, mouse.y + delta_y);
				this.cargo[i].circle.radius = this.cargo[i].circle.radius * scale;
				for (let j = 0; j < this.cargo[i].lines.length; j++) {
					this.cargo[i].lines[j].style.line_width *= scale;
				}
			}
			update_lines();
			draw();
		}
		
		const update_lines = () => {
			for (let i = 0; i < this.cargo.length; i++) {
				const record = this.cargo[i];
				const x0 = record.node.x;
				const y0 = record.node.y;
				for (let p = 0; p < record.node.edges.length; p++) {
					const target_index = record.node.edges[p].target_index;
					const target_record = this.cargo[target_index];
					const x1 = target_record.node.x;
					const y1 = target_record.node.y;
					this.cargo[i].lines[p].x0 = x0;
					this.cargo[i].lines[p].y0 = y0;
					this.cargo[i].lines[p].x1 = x1;
					this.cargo[i].lines[p].y1 = y1;
				}
			}
		}

		document.addEventListener('mousedown', mouse_button.bind(this), false);
		document.addEventListener('mousemove', mouse_move.bind(this), false);
		document.addEventListener('mouseup', mouse_button.bind(this), false);
		document.addEventListener('wheel', mouse_zoom.bind(this), false);

		update_lines();
		this.center();

	}
}

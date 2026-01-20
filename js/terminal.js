///////////////////////////////////////////////////////////////////////////////
// terminal.js

function create_terminal() {
	//////////////////////////////////////////////////////////////////////
	// This function creates an output terminal to which lines of text
	// can be added.
	// An object with the following elements is returned:
	//  table_obj.element          	<-- the HTML element of the terminal
	//	table_obj.id								<-- the object id
	//////////////////////////////////////////////////////////////////////
	const id = guid();
	const terminal = document.createElement('div');
	terminal.classList.add('terminal');
	terminal.classList.add('overflow_y');
	terminal.id = 'terminal-' + id;
	const obj = {};
	obj.id = id;
	obj.element = terminal;
	obj.line_limit = 400;
	obj.add_line = (line) => {
		const is_at_bottom = obj.element.scrollHeight - obj.element.clientHeight <= obj.element.scrollTop + 1;
		let output = obj.element.innerHTML;
		output += '<p>' + line + '</p>';
		obj.element.innerHTML = output;
		while (obj.element.getElementsByTagName('p').length > obj.line_limit) {
			let children = obj.element.getElementsByTagName('p');
			obj.element.removeChild(children[0]);
		}
		if (is_at_bottom) { obj.element.scrollTop = obj.element.scrollHeight; }
	}
	
	return obj;

}
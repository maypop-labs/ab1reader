///////////////////////////////////////////////////////////////////////////////
// random.js

class RANDOM {

	constructor() {}

	guid() {
		// Returns a Globally Unique Identifier.
		function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
		return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
	}

	int_from_interval(min, max) {
		// Returns an integer chosen randomly from the specified interval
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

}

const random = new RANDOM();

module.exports = { random }
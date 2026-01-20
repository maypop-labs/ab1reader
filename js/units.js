///////////////////////////////////////////////////////////////////////////////
// units.js
///////////////////////////////////////////////////////////////////////////////
// LENGTH /////////////////////////////////////////////////////////////////////

function convert_length(value, from_unit, to_unit) {
	const conversion_factors = {
		"mm": {
			"mm": 1,
			"cm": 0.1,
			"m": 0.001,
			"km": 0.000001,
			"in": 0.0393701,
			"ft": 0.00328084,
			"yd": 0.00109361,
			"mi": 0.000000621371
		},
		"cm": {
			"mm": 10,
			"cm": 1,
			"m": 0.01,
			"km": 0.00001,
			"in": 0.393701,
			"ft": 0.0328084,
			"yd": 0.0109361,
			"mi": 0.00000621371
		},
		"m": {
			"mm": 1000,
			"cm": 100,
			"m": 1,
			"km": 0.001,
			"in": 39.3701,
			"ft": 3.28084,
			"yd": 1.09361,
			"mi": 0.000621371
		},
		"km": {
			"mm": 1000000,
			"cm": 100000,
			"m": 1000,
			"km": 1,
			"in": 39370.1,
			"ft": 3280.84,
			"yd": 1093.61,
			"mi": 0.621371
		},
		"in": {
			"mm": 25.4,
			"cm": 2.54,
			"m": 0.0254,
			"km": 0.0000254,
			"in": 1,
			"ft": 0.0833333,
			"yd": 0.0277778,
			"mi": 0.0000157828
		},
		"ft": {
			"mm": 304.8,
			"cm": 30.48,
			"m": 0.3048,
			"km": 0.0003048,
			"in": 12,
			"ft": 1,
			"yd": 0.333333,
			"mi": 0.000189394
		},
		"yd": {
			"mm": 914.4,
			"cm": 91.44,
			"m": 0.9144,
			"km": 0.0009144,
			"in": 36,
			"ft": 3,
			"yd": 1,
			"mi": 0.000568182
		},
		"mi": {
			"mm": 1609340,
			"cm": 160934,
			"m": 1609.34,
			"km": 1.60934,
			"in": 63360,
			"ft": 5280,
			"yd": 1760,
			"mi": 1
		}
	};
  if (conversion_factors[from_unit] && conversion_factors[from_unit][to_unit] !== undefined) {
    return value * conversion_factors[from_unit][to_unit];
  } else {
    throw new Error("Invalid units for conversion.");
  }
}

const length_unit_abbreviations = [
  // Metric System
  "mm",  // millimeter
  "cm",  // centimeter
  "m",   // meter
  "km",  // kilometer
  // Imperial System
  "in",  // inch
  "ft",  // foot
  "yd",  // yard
  "mi"   // mile
];

const lsngth_unit_abbreviation_to_name = {
  // Metric System
  "mm": "millimeter",
  "cm": "centimeter",
  "m": "meter",
  "km": "kilometer",
  // Imperial System
  "in": "inch",
  "ft": "foot",
  "yd": "yard",
  "mi": "mile"
};

const length_unit_names = [
  // Metric System
  "millimeter",
  "centimeter",
  "meter",
  "kilometer",
  // Imperial System
  "inch",
  "foot",
  "yard",
  "mile"
];

const length_unit_name_to_abbreviation = {
  // Metric System
  "millimeter": "mm",
  "centimeter": "cm",
  "meter": "m",
  "kilometer": "km",
  // Imperial System
  "inch": "in",
  "foot": "ft",
  "yard": "yd",
  "mile": "mi"
};

///////////////////////////////////////////////////////////////////////////////
// WEIGHT /////////////////////////////////////////////////////////////////////

function convert_weight(value, from_unit, to_unit) {
	// This single function can handle conversions between all the specified
	//	units. The conversion_rates object contains the necessary multipliers
	//	to convert any unit to any other unit via grams as an intermediary.
	//	This ensures accuracy and simplicity in the conversion process.
	const conversion_rates = {
		gram: {
			gram: 1,
			kilogram: 1 / 1000,
			milligram: 1000,
			microgram: 1000000,
			pound: 1 / 453.59237,
			ounce: 1 / 28.349523125,
			stone: 1 / 6350.29318
		},
		kilogram: {
			gram: 1000,
			kilogram: 1,
			milligram: 1000000,
			microgram: 1000000000,
			pound: 2.2046226218,
			ounce: 35.27396195,
			stone: 0.1574730444
		},
		milligram: {
			gram: 1 / 1000,
			kilogram: 1 / 1000000,
			milligram: 1,
			microgram: 1000,
			pound: 1 / 453592.37,
			ounce: 1 / 28349.523125,
			stone: 1 / 6350293.18
		},
		microgram: {
			gram: 1 / 1000000,
			kilogram: 1 / 1000000000,
			milligram: 1 / 1000,
			microgram: 1,
			pound: 1 / 453592370,
			ounce: 1 / 28349523.125,
			stone: 1 / 6350293180
		},
		pound: {
			gram: 453.59237,
			kilogram: 0.45359237,
			milligram: 453592.37,
			microgram: 453592370,
			pound: 1,
			ounce: 16,
			stone: 1 / 14
		},
		ounce: {
			gram: 28.349523125,
			kilogram: 0.028349523125,
			milligram: 28349.523125,
			microgram: 28349523.125,
			pound: 1 / 16,
			ounce: 1,
			stone: 1 / 224
		},
		stone: {
			gram: 6350.29318,
			kilogram: 6.35029318,
			milligram: 6350293.18,
			microgram: 6350293180,
			pound: 14,
			ounce: 224,
			stone: 1
		}
	};
	// Ensure the from_unit and to_unit are valid
	if (!conversion_rates[from_unit] || !conversion_rates[to_unit]) {
		throw new Error("Invalid unit provided.");
	}
	// Convert the value to grams first, then to the target unit
	const value_in_grams = value * conversion_rates[from_unit].gram;
	const converted_value = value_in_grams * conversion_rates.gram[to_unit];
	return converted_value;
}

const weight_unit_abbreviation_to_name = {
	"g": "gram",
	"kg": "kilogram",
	"ug": "microgram",
	"mg": "milligram",
	"oz": "ounce",
	"lb": "pound",
	"st": "stone"
};

const weight_unit_abbreviations = [
	"g",
	"kg",
	"ug",
	"mg",
	"oz",
	"lb",
	"st"
];

const weight_unit_names = [
	"gram",
	"kilogram",
	"microgram",
	"milligram",
	"ounce",
	"pound",
	"stone"
];

const weight_unit_name_to_abbreviation = {
	"gram": "g",
	"kilogram": "kg",
	"microgram": "ug",
	"milligram": "mg",
	"ounce": "oz",
	"pound": "lb",
	"stone": "st"
};

const axios = require("axios");
const NodeCache = require("node-cache");

// Cache for 24 hours (86400 seconds) since ratings change maybe once per day
const cache = new NodeCache({ stdTTL: 86400 });

// Helper functions (same as your extension)
const getFirstName = (name) => {
	if (!name) return "";
	const arr = name.split(" ");
	return arr[0];
};

const getLastName = (name) => {
	if (!name) return "";
	const arr = name.split(" ");
	if (arr.length >= 2) {
		return arr.slice(-2).join(" ");
	}
	return arr[arr.length - 1];
};

const removeSpecialChars = (name) => {
	if (!name) return "";
	return name
		.normalize("NFD")
		.replace(
			/([^n\u0300-\u036f]|n(?!\u0303(?![\u0300-\u036f])))[\u0300-\u036f]+/gi,
			"$1"
		)
		.normalize();
};

const getLastNameRegex = (name, unicode) => {
	const removed = removeSpecialChars(name);
	const arrAccent = unicode.split(" ");
	const arrRemoved = removed.split(" ");

	return `(${arrAccent[0]}|${arrAccent[0].toLowerCase()}|${
		arrRemoved[0]
	}|${arrRemoved[0].toLowerCase()}|${arrRemoved[0].toUpperCase()})[^}]*(${
		arrAccent[1]
	}|${arrAccent[1].toLowerCase()}|${
		arrRemoved[1]
	}|${arrRemoved[1].toLowerCase()}|${arrRemoved[1].toUpperCase()})`;
};

const transformSpecialChars = (string) => {
	const specialChars = [
		225, 233, 237, 243, 250, 193, 201, 205, 211, 218, 241,
	];
	let stringUnicode = "";

	for (let i = 0; i < string.length; i++) {
		const charCode = string.charCodeAt(i);
		if (specialChars.includes(charCode)) {
			stringUnicode += "\\\\u00" + charCode.toString(16);
		} else {
			stringUnicode += string[i];
		}
	}

	return stringUnicode;
};

const getProfessorUrl = (firstName, lastName, id) => {
	const first = removeSpecialChars(firstName);
	const last = removeSpecialChars(lastName);
	const name = first.split(" ").concat(last.split(" ")).join("-");
	return `https://www.misprofesores.com/profesores/${name}_${id}`;
};

exports.handler = async (event, context) => {
	// Set function timeout
	context.callbackWaitsForEmptyEventLoop = false;

	// Enable CORS
	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	};

	// Handle preflight requests
	if (event.httpMethod === "OPTIONS") {
		return {
			statusCode: 200,
			headers,
			body: "",
		};
	}

	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: "Method not allowed" }),
		};
	}

	try {
		const { professorNames } = JSON.parse(event.body);

		if (!professorNames || !Array.isArray(professorNames)) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({
					error: "Invalid professor names array",
				}),
			};
		}

		// Limit batch size to prevent timeouts
		if (professorNames.length > 50) {
			return {
				statusCode: 400,
				headers,
				body: JSON.stringify({
					error: "Too many professors in single request. Maximum 50 allowed.",
					maxAllowed: 50,
					received: professorNames.length,
				}),
			};
		}

		console.log(`Processing ${professorNames.length} professors`);

		// Check if we have cached template data
		const cacheKey = "misprofesores-template";
		let template = cache.get(cacheKey);

		if (!template) {
			console.log("Fetching template from MisProfesores.com");
			// Fetch from MisProfesores.com only if not cached
			const response = await axios.get(
				"https://www.misprofesores.com/escuelas/Facultad-de-Ciencias-UNAM_2842",
				{
					timeout: 10000, // 10 second timeout
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
				}
			);

			if (response.status !== 200) {
				throw new Error(`HTTP ${response.status}`);
			}

			template = response.data;
			// Cache the template for 24 hours
			cache.set(cacheKey, template);
		}
		const results = [];

		for (const professorName of professorNames) {
			if (!professorName) {
				results.push(null);
				continue;
			}

			const firstName = getFirstName(professorName);
			const lastName = getLastName(professorName);

			if (!firstName || !lastName) {
				results.push(null);
				continue;
			}

			const firstUnicode = transformSpecialChars(firstName);
			const lastUnicode = transformSpecialChars(lastName);

			const regExString = `\\{[^}]*(${firstUnicode}|${firstUnicode.toLowerCase()}|${removeSpecialChars(
				firstName
			)}|${removeSpecialChars(
				firstName
			).toLowerCase()}|${removeSpecialChars(
				firstName
			).toUpperCase()})[^}]*${getLastNameRegex(
				lastName,
				lastUnicode
			)}.*?\\}`;

			const regEx = new RegExp(regExString);

			try {
				if (regEx.test(template)) {
					const match = template.match(regEx);
					if (match && match[0]) {
						const profObject = JSON.parse(match[0]);
						results.push({
							name: profObject.n + " " + profObject.a,
							rating:
								Math.round(parseFloat(profObject.c) * 10) / 10, // Round to 1 decimal place
							commentCount: parseInt(profObject.m),
							id: profObject.i,
							url: getProfessorUrl(
								firstName,
								lastName,
								profObject.i
							),
						});
					} else {
						results.push(null);
					}
				} else {
					results.push(null);
				}
			} catch (parseError) {
				console.warn(
					`Failed to parse professor data for ${professorName}:`,
					parseError
				);
				results.push(null);
			}
		}

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify(results),
		};
	} catch (error) {
		console.error("Error fetching professor ratings:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				error: "Failed to fetch professor ratings",
				message: error.message,
			}),
		};
	}
};

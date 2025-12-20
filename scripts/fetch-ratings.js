import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions from your existing Netlify function
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

const fetchProfessorRating = (professorName, template) => {
	if (!professorName) return null;

	const firstName = getFirstName(professorName);
	const lastName = getLastName(professorName);

	if (!firstName || !lastName) return null;

	const firstUnicode = transformSpecialChars(firstName);
	const lastUnicode = transformSpecialChars(lastName);

	const regExString = `\\{[^}]*(${firstUnicode}|${firstUnicode.toLowerCase()}|${removeSpecialChars(
		firstName
	)}|${removeSpecialChars(firstName).toLowerCase()}|${removeSpecialChars(
		firstName
	).toUpperCase()})[^}]*${getLastNameRegex(lastName, lastUnicode)}.*?\\}`;

	const regEx = new RegExp(regExString);

	try {
		if (regEx.test(template)) {
			const match = template.match(regEx);
			if (match && match[0]) {
				const profObject = JSON.parse(match[0]);

				// Validate the professor data
				const rating = parseFloat(profObject.c);
				const commentCount = parseInt(profObject.m);

				// Only return valid data
				if (
					isNaN(rating) ||
					isNaN(commentCount) ||
					rating <= 0 ||
					commentCount <= 0
				) {
					return null;
				}

				return {
					name: profObject.n + " " + profObject.a,
					rating: Math.round(rating * 10) / 10,
					commentCount: commentCount,
					id: profObject.i,
					url: getProfessorUrl(firstName, lastName, profObject.i),
				};
			}
		}
		return null;
	} catch (parseError) {
		console.warn(
			`Failed to parse professor data for ${professorName}:`,
			parseError
		);
		return null;
	}
};

const main = async () => {
	try {
		console.log("🔍 Starting professor ratings fetch...");

		const outputDir = path.join(__dirname, "..", "public", "data");

		// Ensure output directory exists
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Read the professor list
		const professorsPath = path.join(outputDir, "professors.json");

		if (!fs.existsSync(professorsPath)) {
			console.error(
				"❌ professors.json not found. Please run extract-professors.js first."
			);
			process.exit(1);
		}

		const professorsData = JSON.parse(
			fs.readFileSync(professorsPath, "utf8")
		);
		const professors = professorsData.professors;

		console.log(
			`📊 Found ${professors.length} unique professors to process`
		);
		console.log(
			`📅 Professors list last updated: ${new Date(
				professorsData.lastUpdated
			).toLocaleString()}`
		);

		// Load existing ratings if they exist
		const ratingsPath = path.join(outputDir, "ratings.json");
		let existingRatings = {};
		if (fs.existsSync(ratingsPath)) {
			try {
				const existingData = JSON.parse(
					fs.readFileSync(ratingsPath, "utf8")
				);
				existingRatings = existingData.ratings || {};
				console.log(
					`📦 Loaded ${
						Object.keys(existingRatings).length
					} existing ratings`
				);
			} catch (error) {
				console.warn("⚠️  Could not load existing ratings:", error);
			}
		}

		// Fetch the template from MisProfesores.com (Facultad de Ciencias)
		console.log("🌐 Fetching template from Facultad de Ciencias...");
		const response = await axios.get(
			"https://www.misprofesores.com/escuelas/Facultad-de-Ciencias-UNAM_2842",
			{
				timeout: 60000, // 60 second timeout
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
					"Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
					"Accept-Encoding": "gzip, deflate, br",
					Connection: "keep-alive",
					"Upgrade-Insecure-Requests": "1",
				},
			}
		);

		const template = response.data;
		console.log(
			`✅ Facultad de Ciencias template fetched successfully (${template.length} characters)`
		);

		// Fetch the fallback template from UNAM general page
		console.log("🌐 Fetching fallback template from UNAM general page...");
		const fallbackResponse = await axios.get(
			"https://www.misprofesores.com/escuelas/UNAM_1059",
			{
				timeout: 60000, // 60 second timeout
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
					"Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
					"Accept-Encoding": "gzip, deflate, br",
					Connection: "keep-alive",
					"Upgrade-Insecure-Requests": "1",
				},
			}
		);

		const fallbackTemplate = fallbackResponse.data;
		console.log(
			`✅ UNAM fallback template fetched successfully (${fallbackTemplate.length} characters)`
		);

		// Process all professors
		const ratings = {};
		let processed = 0;
		let found = 0;
		let foundWithFallback = 0;
		let keptExisting = 0;
		let upgraded = 0;
		const foundProfessors = [];

		console.log("🔄 Processing professors...");

		for (const professorName of professors) {
			// First try with the main template (Facultad de Ciencias)
			let rating = fetchProfessorRating(professorName, template);
			let source = "Facultad de Ciencias";

			// If not found, try with the fallback template (UNAM general)
			if (!rating) {
				rating = fetchProfessorRating(professorName, fallbackTemplate);
				if (rating) {
					foundWithFallback++;
					source = "UNAM General";
				}
			}

			// Decision logic: keep the rating with the most comments
			const existingRating = existingRatings[professorName];

			if (rating && existingRating) {
				// Both new and existing ratings exist - keep the one with more comments
				if (
					existingRating.commentCount &&
					rating.commentCount <= existingRating.commentCount
				) {
					// Keep existing rating (has more or equal comments)
					ratings[professorName] = existingRating;
					keptExisting++;
				} else {
					// Use new rating (has more comments)
					ratings[professorName] = rating;
					upgraded++;
				}
			} else if (rating) {
				// Only new rating exists
				ratings[professorName] = rating;
			} else if (existingRating) {
				// Only existing rating exists - keep it
				ratings[professorName] = existingRating;
				keptExisting++;
			} else {
				// No rating found (new or existing)
				ratings[professorName] = null;
			}

			if (ratings[professorName]) {
				found++;
				foundProfessors.push({
					name: professorName,
					rating: ratings[professorName].rating,
					comments: ratings[professorName].commentCount,
					source: source,
				});

				if (found <= 10) {
					// Show first 10 found ratings
					console.log(
						`⭐ ${professorName}: ${
							ratings[professorName].rating
						}/10 (${
							ratings[professorName].commentCount
						} comentarios) [${source}]`
					);
				}
			}

			processed++;

			if (processed % 100 === 0) {
				console.log(
					`📈 Processed ${processed}/${professors.length} professors (${found} ratings, ${keptExisting} kept from previous, ${upgraded} upgraded)`
				);
			}
		}

		// Write ratings to file
		const ratingsData = {
			lastUpdated: new Date().toISOString(),
			totalProfessors: professors.length,
			ratingsFound: found,
			foundPercentage: Math.round((found / professors.length) * 100),
			ratings: ratings,
			statistics: {
				processed: processed,
				found: found,
				notFound: processed - found,
				foundWithFallback: foundWithFallback,
				foundWithMainTemplate: found - foundWithFallback,
				keptExisting: keptExisting,
				upgraded: upgraded,
			},
		};

		fs.writeFileSync(ratingsPath, JSON.stringify(ratingsData, null, 2));

		console.log("\n🎉 Processing complete!");
		console.log(`📊 Total professors processed: ${processed}`);
		console.log(
			`⭐ Ratings found: ${found} (${ratingsData.foundPercentage}%)`
		);
		console.log(
			`   - Found with main template: ${found - foundWithFallback}`
		);
		console.log(`   - Found with fallback template: ${foundWithFallback}`);
		console.log(`   - Kept existing ratings: ${keptExisting}`);
		console.log(`   - Upgraded to new ratings: ${upgraded}`);
		console.log(`📁 Ratings saved to ${ratingsPath}`);

		// Show top rated professors
		if (foundProfessors.length > 0) {
			console.log("\n🏆 Top rated professors:");
			foundProfessors
				.sort((a, b) => b.rating - a.rating)
				.slice(0, 5)
				.forEach((prof, index) => {
					console.log(
						`   ${index + 1}. ${prof.name}: ${prof.rating}/10 (${
							prof.comments
						} comentarios) [${prof.source}]`
					);
				});
		}
	} catch (error) {
		console.error("❌ Error fetching ratings:", error);

		if (error.response) {
			console.error(`HTTP Status: ${error.response.status}`);
			console.error(`Response headers:`, error.response.headers);
		}

		process.exit(1);
	}
};

// Run the main function if this file is executed directly
main();

export default main;

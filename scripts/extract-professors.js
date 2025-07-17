const fs = require("fs");
const path = require("path");

const extractProfessors = () => {
	const srcDataDir = path.join(__dirname, "..", "src", "data");
	const outputDir = path.join(__dirname, "..", "data");
	const professorSet = new Set(); // Use Set to avoid duplicates

	console.log("📂 Extracting professors from data files...");

	// Ensure output directory exists
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Read all your existing JSON files
	const files = [
		"actuaria.json",
		"biologia-1997.json",
		"biologia-2025.json",
		"ciencias-computacion.json",
		"fisica.json",
		"fisica-biomedica.json",
		"matematicas.json",
		"matematicas-aplicadas.json",
	];

	let totalProfessors = 0;
	let filesProcessed = 0;

	files.forEach((filename) => {
		const filePath = path.join(srcDataDir, filename);

		if (fs.existsSync(filePath)) {
			console.log(`📄 Processing ${filename}...`);
			filesProcessed++;

			try {
				const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

				// Navigate through your data structure
				Object.entries(data).forEach(([semester, subjects]) => {
					if (subjects && typeof subjects === "object") {
						Object.entries(subjects).forEach(
							([subjectKey, groups]) => {
								if (groups && typeof groups === "object") {
									Object.entries(groups).forEach(
										([groupKey, groupData]) => {
											// Extract professor name
											if (groupData?.profesor?.nombre) {
												professorSet.add(
													groupData.profesor.nombre.trim()
												);
												totalProfessors++;
											}

											// Extract assistant names
											if (
												groupData?.ayudantes &&
												Array.isArray(
													groupData.ayudantes
												)
											) {
												groupData.ayudantes.forEach(
													(assistant) => {
														if (assistant?.nombre) {
															professorSet.add(
																assistant.nombre.trim()
															);
															totalProfessors++;
														}
													}
												);
											}
										}
									);
								}
							}
						);
					}
				});
			} catch (error) {
				console.error(`❌ Error processing ${filename}:`, error);
			}
		} else {
			console.warn(`⚠️  File not found: ${filename}`);
		}
	});

	// Convert Set to Array and sort
	const professorsList = Array.from(professorSet).sort();

	// Write to professors.json
	const professorsPath = path.join(outputDir, "professors.json");
	const professorsData = {
		lastUpdated: new Date().toISOString(),
		totalUnique: professorsList.length,
		totalOccurrences: totalProfessors,
		filesProcessed: filesProcessed,
		professors: professorsList,
	};

	fs.writeFileSync(professorsPath, JSON.stringify(professorsData, null, 2));

	console.log(
		`✅ Successfully extracted ${professorsList.length} unique professors`
	);
	console.log(`📊 Total professor occurrences: ${totalProfessors}`);
	console.log(`📁 Files processed: ${filesProcessed}`);
	console.log(`📁 Professors list saved to ${professorsPath}`);

	// Show first few professors as preview
	console.log("\n👨‍🏫 Sample professors:");
	professorsList.slice(0, 10).forEach((prof, i) => {
		console.log(`   ${i + 1}. ${prof}`);
	});

	if (professorsList.length > 10) {
		console.log(`   ... and ${professorsList.length - 10} more`);
	}

	return professorsList;
};

// Run the extraction if this file is executed directly
if (require.main === module) {
	extractProfessors();
}

module.exports = extractProfessors;

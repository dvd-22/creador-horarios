import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAJORS = [
	"actuaria",
	"ciencias-computacion",
	"matematicas",
	"matematicas-aplicadas",
	"fisica",
	"fisica-biomedica",
	"biologia-1997",
	"biologia-2025",
];

function convertCsvToJson(csvFilePath, jsonFilePath) {
	console.log(`🔄 Converting ${csvFilePath} to ${jsonFilePath}...`);

	// Read CSV file
	let csvData = fs.readFileSync(csvFilePath, "utf8");

	// Apply replacements (your existing logic)
	const replacements = [
		{
			pattern: /\bModalidad\s+/g,
			replacement: "",
		},
		{
			pattern: /(")?(presencial|virtual|híbrida|mixta)(")?/gi,
			replacement: (match) =>
				match.charAt(0).toUpperCase() + match.slice(1).toLowerCase(),
		},
		{
			pattern: /(\d)[\s]*-[\s]*(\d)/g,
			replacement: "$1 - $2",
		},
	];

	// Apply each replacement
	replacements.forEach(({ pattern, replacement }) => {
		csvData = csvData.replace(pattern, replacement);
	});

	// Parse CSV
	const parsedData = Papa.parse(csvData, { header: true }).data;

	const result = {};

	parsedData.forEach((row) => {
		const {
			semestre,
			materia,
			gid,
			nombre,
			nombres,
			horarios,
			dias,
			"dias-ayudantes": diasAyudantes,
			nota,
			horas,
			salon,
			modalidad,
			"presentacion-href": presentacionHref,
		} = row;

		const groupId = gid?.match(/\d+/)?.[0];

		if (!semestre || !materia || !groupId) {
			console.warn("Invalid row, missing key data:", {
				semestre,
				materia,
				gid,
				groupId,
			});
			return;
		}

		if (!result[semestre]) {
			result[semestre] = {};
		}

		if (!result[semestre][materia]) {
			result[semestre][materia] = {};
		}

		if (!result[semestre][materia][groupId]) {
			result[semestre][materia][groupId] = {
				grupo: groupId,
				profesor: null,
				ayudantes: [],
				nota: nota?.trim() || null,
				salon: salon?.trim() || null,
				modalidad: modalidad?.trim()
					? modalidad.charAt(0).toUpperCase() +
					  modalidad.slice(1).toLowerCase()
					: null,
				presentacion: presentacionHref?.trim() || null,
			};
		}

		const group = result[semestre][materia][groupId];

		// Process professor
		// Include professors if they have either a name OR schedule data
		if (
			(nombre && nombre.trim()) ||
			(dias && dias.trim()) ||
			(horas && horas.trim())
		) {
			try {
				const diasProfesor = dias?.trim()
					? JSON.parse(dias).map((d) => d.dias)
					: null;
				const horarioProfesor = horas?.trim() || null;

				// Only create professor if they have meaningful data
				const hasName = nombre && nombre.trim();
				const hasSchedule =
					horarioProfesor ||
					(diasProfesor && diasProfesor.length > 0);

				if (hasName || hasSchedule) {
					if (!group.profesor) {
						group.profesor = {
							nombre: hasName ? nombre.trim() : null,
							horarios: [],
						};
					}

					if (diasProfesor && horarioProfesor) {
						group.profesor.horarios.push({
							horario: horarioProfesor,
							dias: diasProfesor,
						});
					}
				}
			} catch (error) {
				console.error("Error processing professor:", error, row);
			}
		}

		// Process assistants
		// Include assistants if they have either a name OR schedule data
		if (
			(nombres && nombres.trim()) ||
			(horarios && horarios.trim()) ||
			(diasAyudantes && diasAyudantes.trim())
		) {
			try {
				let diasAyud = [];
				let horarioAyud = null;

				// Parse schedule data if available
				if (diasAyudantes && diasAyudantes.trim()) {
					const parsedDias = JSON.parse(diasAyudantes);
					diasAyud = parsedDias.map((d) => d["dias-ayudantes"]);
				}

				if (horarios && horarios.trim()) {
					horarioAyud = horarios.trim();
				}

				// Only add assistant if they have meaningful data
				const hasName = nombres && nombres.trim();
				const hasSchedule =
					horarioAyud || (diasAyud && diasAyud.length > 0);

				if (hasName || hasSchedule) {
					group.ayudantes.push({
						nombre: hasName ? nombres.trim() : null,
						horario: horarioAyud,
						dias: diasAyud,
					});
				}
			} catch (error) {
				console.error("Error processing assistant:", error, row);
			}
		}
	});

	// Save JSON file
	fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
	console.log(`✅ Conversion complete: JSON saved to ${jsonFilePath}`);
}

async function convertAllCsvsToJson() {
	console.log("🔄 Converting all CSV files to JSON...");

	for (const major of MAJORS) {
		const csvPath = path.resolve(__dirname, "..", "..", `${major}.csv`);
		const jsonPath = path.resolve(
			__dirname,
			"..",
			"..",
			"src",
			"data",
			`${major}.json`
		);

		if (fs.existsSync(csvPath)) {
			convertCsvToJson(csvPath, jsonPath);
		} else {
			console.warn(`⚠️ CSV file not found: ${csvPath}`);
		}
	}

	console.log("🎉 All conversions completed!");
}

// Run if this file is executed directly
convertAllCsvsToJson().catch(console.error);

export default convertAllCsvsToJson;

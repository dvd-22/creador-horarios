import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAJORS = [
	"actuaria",
	"matematicas",
	"matematicas-aplicadas",
	"fisica",
	"fisica-biomedica",
	"biologia-1997",
	"biologia-2025",
];

function convertCsvToJson(major) {
	const csvPath = `${major}.csv`;
	const jsonPath = `./src/data/${major}.json`;

	console.log(`🔄 Converting ${csvPath} to ${jsonPath}...`);

	// Read CSV file
	let csvData = fs.readFileSync(csvPath, "utf8");

	// Apply replacements (existing logic)
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
		const semestre = row.semestre?.trim();
		const materia = row.materia?.trim();
		const gid = row.gid?.trim();

		if (!semestre || !materia || !gid) {
			return; // Skip invalid rows
		}

		// Initialize structure
		if (!result[semestre]) {
			result[semestre] = {};
		}
		if (!result[semestre][materia]) {
			result[semestre][materia] = {};
		}

		const grupo = result[semestre][materia][gid] || {
			grupo: gid,
			profesor: {},
			ayudantes: [],
			nota: null,
			salon: null,
			modalidad: null,
			presentacion: null,
		};

		// Handle professor data
		if (row.nombre && row.nombre.trim()) {
			grupo.profesor.nombre = row.nombre.trim();
			if (row.horarios && row.horarios.trim()) {
				grupo.profesor.horarios = grupo.profesor.horarios || [];

				try {
					const dias = JSON.parse(row.dias || "[]");
					grupo.profesor.horarios.push({
						horario: row.horarios.trim(),
						dias: dias.map((d) => d.dias).filter(Boolean),
					});
				} catch (e) {
					console.warn(
						`Warning: Could not parse dias for ${row.nombre}: ${row.dias}`
					);
				}
			}

			grupo.salon = row.salon?.trim() || null;
			grupo.modalidad = row.modalidad?.trim() || null;
			grupo.presentacion = row["presentacion-href"]?.trim() || null;
		}

		// Handle assistant data
		if (row.nombres && row.nombres.trim()) {
			const assistantName = row.nombres.trim();
			let existingAssistant = grupo.ayudantes.find(
				(a) => a.nombre === assistantName
			);

			if (!existingAssistant) {
				existingAssistant = {
					nombre: assistantName,
					horario: row.horarios?.trim() || null,
					dias: [],
					salon: row["salon-ayudante"]?.trim() || null,
				};
				grupo.ayudantes.push(existingAssistant);
			}

			// Parse assistant schedule
			if (row["dias-ayudantes"]) {
				try {
					const diasAyudantes = JSON.parse(row["dias-ayudantes"]);
					const diasList = diasAyudantes
						.map((d) => d["dias-ayudantes"])
						.filter(Boolean);
					existingAssistant.dias = [
						...new Set([...existingAssistant.dias, ...diasList]),
					];
				} catch (e) {
					console.warn(
						`Warning: Could not parse dias-ayudantes for ${assistantName}: ${row["dias-ayudantes"]}`
					);
				}
			}
		}

		result[semestre][materia][gid] = grupo;
	});

	// Count stats
	let totalSubjects = 0;
	let totalGroups = 0;
	let totalAssistants = 0;

	Object.values(result).forEach((semestre) => {
		Object.values(semestre).forEach((materia) => {
			totalSubjects++;
			Object.values(materia).forEach((grupo) => {
				totalGroups++;
				totalAssistants += grupo.ayudantes?.length || 0;
			});
		});
	});

	console.log(
		`   📊 ${totalSubjects} subjects, ${totalGroups} groups, ${totalAssistants} assistants`
	);

	// Write to file
	fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
	console.log(`   ✅ Saved!`);
}

console.log(
	"🔄 Converting all remaining majors to JSON with assistant salon data...\n"
);

for (const major of MAJORS) {
	if (fs.existsSync(`${major}.csv`)) {
		convertCsvToJson(major);
	} else {
		console.warn(`⚠️ CSV file not found: ${major}.csv`);
	}
}

console.log("\n🎉 All conversions completed!");

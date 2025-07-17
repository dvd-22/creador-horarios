import puppeteer from "puppeteer";
import fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

const MAJORS_CONFIG = {
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/1556":
		"ciencias-computacion",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/2017":
		"actuaria",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/2272":
		"biologia-2025",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/181":
		"biologia-1997",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/1081":
		"fisica",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/2016":
		"fisica-biomedica",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/217":
		"matematicas",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/2055":
		"matematicas-aplicadas",
};

async function scrapeSchedules() {
	console.log("🔍 Starting schedule scraping...");

	// Read the materias data
	const materiasData = JSON.parse(fs.readFileSync("./materias.json", "utf8"));

	const browser = await puppeteer.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-extensions",
			"--disable-plugins",
			"--disable-images",
			"--no-first-run",
			"--disable-background-timer-throttling",
			"--disable-backgrounding-occluded-windows",
			"--disable-renderer-backgrounding",
		],
	});

	// Group materias by major
	const materiasByMajor = {};
	materiasData.forEach((materia) => {
		const majorKey = materia["web-scraper-start-url"];
		if (!materiasByMajor[majorKey]) {
			materiasByMajor[majorKey] = [];
		}
		materiasByMajor[majorKey].push(materia["materias-href"]);
	});

	for (const [majorUrl, majorName] of Object.entries(MAJORS_CONFIG)) {
		const subjectUrls = materiasByMajor[majorUrl] || [];

		if (subjectUrls.length === 0) {
			console.log(`⚠️ No subjects found for ${majorName}`);
			continue;
		}

		console.log(
			`📚 Scraping ${majorName} (${subjectUrls.length} subjects)...`
		);

		const scheduleData = [];

		for (let i = 0; i < subjectUrls.length; i++) {
			const url = subjectUrls[i];
			console.log(
				`  📖 Processing subject ${i + 1}/${subjectUrls.length}...`
			);

			const page = await browser.newPage();

			try {
				await page.goto(url, {
					waitUntil: "domcontentloaded",
					timeout: 15000,
				});

				// Get subject name and semester
				const subjectInfo = await page.evaluate(() => {
					const materia =
						document
							.querySelector("h2.headline")
							?.textContent?.trim() || "";
					const semestre =
						document
							.querySelector(".ml-2 div")
							?.textContent?.trim() || "";
					return { materia, semestre };
				});

				// Get all groups
				const groups = await page.evaluate(() => {
					const groupElements = document.querySelectorAll(
						"div.v-expansion-panel"
					);
					return Array.from(groupElements).map((group) => {
						const gid =
							group
								.querySelector(
									".v-toolbar-title__placeholder > span:nth-of-type(1)"
								)
								?.textContent?.trim() || "";
						const nota =
							group
								.querySelector(".ma-2 .v-chip__content span")
								?.textContent?.trim() || "";
						const modalidad =
							group
								.querySelector("span .v-chip div")
								?.textContent?.trim() || "";
						const presentacion =
							group.querySelector("a.presentacion")?.href || "";

						// Get professor info
						const professorRow = group.querySelector(
							"div.v-row.my-1:nth-of-type(1)"
						);
						const professorInfo = professorRow
							? {
									nombre:
										professorRow
											.querySelector("a.profesor_a")
											?.textContent?.trim() || "",
									horarios: Array.from(
										professorRow.querySelectorAll(
											"div.d-flex"
										)
									).map((horario) => ({
										dias: JSON.stringify(
											Array.from(
												horario.querySelectorAll(
													"div.bg-blue-lighten-2"
												)
											).map((d) => ({
												dias:
													d.textContent?.trim() || "",
											}))
										),
										horas:
											horario
												.querySelector(
													".v-col-sm-5 div.v-chip__content"
												)
												?.textContent?.trim() || "",
										salon:
											horario
												.querySelector("a")
												?.textContent?.trim() || "",
									})),
							  }
							: null;

						// Get assistants info
						const assistantRows = group.querySelectorAll(
							"div.my-1.v-row:nth-of-type(n+2)"
						);
						const assistants = Array.from(assistantRows).map(
							(row) => ({
								nombres:
									row
										.querySelector("a.profesor_a")
										?.textContent?.trim() || "",
								horarios:
									row
										.querySelector(
											".v-col-sm-5 div.v-chip__content"
										)
										?.textContent?.trim() || "",
								"dias-ayudantes": JSON.stringify(
									Array.from(
										row.querySelectorAll(
											"div.bg-blue-lighten-2"
										)
									).map((d) => ({
										"dias-ayudantes":
											d.textContent?.trim() || "",
									}))
								),
							})
						);

						return {
							gid,
							nota,
							modalidad,
							presentacion,
							profesor: professorInfo,
							ayudantes: assistants,
						};
					});
				});

				// Convert to CSV format
				groups.forEach((group) => {
					// Add professor data
					if (group.profesor) {
						group.profesor.horarios.forEach((horario) => {
							scheduleData.push({
								semestre: subjectInfo.semestre,
								materia: subjectInfo.materia,
								gid: group.gid,
								nombre: group.profesor.nombre,
								nombres: "",
								horarios: "",
								dias: horario.dias,
								"dias-ayudantes": "",
								nota: group.nota,
								horas: horario.horas,
								salon: horario.salon,
								modalidad: group.modalidad,
								"presentacion-href": group.presentacion,
							});
						});
					}

					// Add assistant data
					group.ayudantes.forEach((assistant) => {
						scheduleData.push({
							semestre: subjectInfo.semestre,
							materia: subjectInfo.materia,
							gid: group.gid,
							nombre: "",
							nombres: assistant.nombres,
							horarios: assistant.horarios,
							dias: "",
							"dias-ayudantes": assistant["dias-ayudantes"],
							nota: group.nota,
							horas: "",
							salon: "",
							modalidad: group.modalidad,
							"presentacion-href": group.presentacion,
						});
					});
				});
			} catch (error) {
				console.error(`❌ Error scraping subject ${url}:`, error);
			} finally {
				await page.close();
			}
		}

		// Save CSV for this major
		const csvWriter = createObjectCsvWriter({
			path: `./${majorName}.csv`,
			header: [
				{ id: "semestre", title: "semestre" },
				{ id: "materia", title: "materia" },
				{ id: "gid", title: "gid" },
				{ id: "nombre", title: "nombre" },
				{ id: "nombres", title: "nombres" },
				{ id: "horarios", title: "horarios" },
				{ id: "dias", title: "dias" },
				{ id: "dias-ayudantes", title: "dias-ayudantes" },
				{ id: "nota", title: "nota" },
				{ id: "horas", title: "horas" },
				{ id: "salon", title: "salon" },
				{ id: "modalidad", title: "modalidad" },
				{ id: "presentacion-href", title: "presentacion-href" },
			],
		});

		await csvWriter.writeRecords(scheduleData);
		console.log(
			`✅ Saved ${scheduleData.length} schedule entries for ${majorName}`
		);
	}

	await browser.close();
	console.log("🎉 Schedule scraping completed!");
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	scrapeSchedules().catch(console.error);
}

export default scrapeSchedules;

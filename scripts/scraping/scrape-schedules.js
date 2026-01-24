import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createObjectCsvWriter } from "csv-writer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAJORS_CONFIG = {
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/1556":
		"ciencias-computacion",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/2017":
		"actuaria",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/2272":
		"biologia-2025",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/181":
		"biologia-1997",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/1081":
		"fisica",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/2016":
		"fisica-biomedica",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/217":
		"matematicas",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/2055":
		"matematicas-aplicadas",
};

async function scrapeSchedules() {
	console.log("🔍 Starting schedule scraping...");

	// Read the materias data (resolve path relative to project root)
	const materiasPath = path.resolve(__dirname, "..", "..", "materias.json");
	const materiasData = JSON.parse(fs.readFileSync(materiasPath, "utf8"));
	console.log(`📊 Loaded ${materiasData.length} materias from materias.json`);

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
			"--memory-pressure-off",
			"--max_old_space_size=4096",
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

	console.log(
		`📚 Found ${Object.keys(MAJORS_CONFIG).length} majors to process`
	);

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
		let processedCount = 0;
		let errorCount = 0;

		for (let i = 0; i < subjectUrls.length; i++) {
			const url = subjectUrls[i];

			// Show progress every 10 subjects
			if (i % 10 === 0 || i === subjectUrls.length - 1) {
				console.log(
					`  📖 Processing subject ${i + 1}/${
						subjectUrls.length
					} (${Math.round((i / subjectUrls.length) * 100)}%)...`
				);
			}

			let page;
			let pageCreated = false;
			let shouldSkip = false;

			try {
				page = await browser.newPage();
				pageCreated = true;

				// Set viewport to reduce memory usage
				await page.setViewport({ width: 1024, height: 768 });

				let retryCount = 0;
				const maxRetries = 3;
				let pageLoaded = false;

				while (retryCount < maxRetries && !pageLoaded) {
					try {
						await page.goto(url, {
							waitUntil: "domcontentloaded",
							timeout: 45000,
						});

						pageLoaded = true;
					} catch (error) {
						retryCount++;

						if (retryCount >= maxRetries) {
							console.error(
								`❌ Error scraping subject ${url} after ${maxRetries} attempts:`,
								error.message
							);
							shouldSkip = true;
							errorCount++;
							break;
						}

						console.warn(
							`⚠️ Retry ${retryCount}/${maxRetries} for ${url}: ${error.message}`
						);
						await new Promise((resolve) =>
							setTimeout(resolve, 2000 * retryCount)
						); // Progressive delay
					}
				}

				// Skip this iteration if all retries failed
				if (shouldSkip || !pageLoaded) {
					continue;
				}

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
								"salon-ayudante":
									row
										.querySelector("a.horario_a")
										?.textContent?.trim() || "",
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
							"salon-ayudante": assistant["salon-ayudante"],
						});
					});
				});
			} catch (error) {
				console.error(
					`❌ Error processing subject data for ${url}:`,
					error.message
				);
			} finally {
				if (pageCreated && page) {
					try {
						await page.close();
					} catch (closeError) {
						console.warn(
							`⚠️ Warning closing page: ${closeError.message}`
						);
					}
				}
			}

			// Add a small delay between requests to be respectful to the server
			if (i < subjectUrls.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}

		// Save CSV for this major (resolve path relative to project root)
		const csvPath = path.resolve(__dirname, "..", "..", `${majorName}.csv`);
		const csvWriter = createObjectCsvWriter({
			path: csvPath,
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
				{ id: "salon-ayudante", title: "salon-ayudante" },
			],
		});

		await csvWriter.writeRecords(scheduleData);
		console.log(
			`✅ Saved ${scheduleData.length} schedule entries for ${majorName}`
		);

		// Show assistant salon statistics
		const assistantWithSalon = scheduleData.filter(
			(record) =>
				record["salon-ayudante"] && record["salon-ayudante"].trim()
		);
		console.log(
			`🎯 Found ${assistantWithSalon.length} assistant records with salon information for ${majorName}`
		);

		// Add a small delay between majors
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	try {
		await browser.close();
		console.log("🎉 Schedule scraping completed!");
	} catch (closeError) {
		console.warn("⚠️ Warning closing browser:", closeError.message);
		// Force close all browser processes
		if (browser && browser.process()) {
			browser.process().kill('SIGTERM');
		}
	}
	
	// Ensure all async operations complete
	await new Promise(resolve => setTimeout(resolve, 1000));
}

// Check if this file is being run directly (not imported as a module)
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
	console.log("Script loaded, running directly...");
	
	// Set a safety timeout to force exit if something hangs
	const safetyTimeout = setTimeout(() => {
		console.warn("⚠️ Safety timeout triggered - forcing exit");
		process.exit(0);
	}, 300000); // 5 minutes
	
	scrapeSchedules()
		.then(() => {
			clearTimeout(safetyTimeout);
			console.log("✨ Scraping function completed, exiting process...");
			process.exit(0);
		})
		.catch((error) => {
			clearTimeout(safetyTimeout);
			console.error("❌ Fatal error:", error);
			process.exit(1);
		});
}

export default scrapeSchedules;

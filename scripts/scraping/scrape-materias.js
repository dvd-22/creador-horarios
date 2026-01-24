import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import createCsvWriter from "csv-writer";

const { createObjectCsvWriter } = createCsvWriter;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAJORS_CONFIG = {
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/1556":
		"Ciencias de la Computación",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/2017":
		"Actuaría",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/2272":
		"Biología 2025",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/181":
		"Biología 1997",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/1081":
		"Física",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/2016":
		"Física Biomédica",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/217":
		"Matemáticas",
	"https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20262/2055":
		"Matemáticas aplicadas",
};

async function scrapeMaterias() {
	console.log("🔍 Starting materias scraping...");

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

	const allMaterias = [];

	for (const [url, majorName] of Object.entries(MAJORS_CONFIG)) {
		console.log(`📚 Scraping ${majorName}...`);

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
						waitUntil: "networkidle2",
						timeout: 30000,
					});
					pageLoaded = true;
				} catch (error) {
					retryCount++;

					if (retryCount >= maxRetries) {
						console.error(
							`❌ Error scraping ${majorName} after ${maxRetries} attempts:`,
							error.message
						);
						shouldSkip = true;
						break;
					}

					console.warn(
						`⚠️ Retry ${retryCount}/${maxRetries} for ${majorName}: ${error.message}`
					);
					await new Promise((resolve) =>
						setTimeout(resolve, 2000 * retryCount)
					); // Progressive delay
				}
			}

			// Skip this major if all retries failed
			if (shouldSkip || !pageLoaded) {
				continue;
			}

			// Wait for the subject links to load
			await page.waitForSelector(".grupoplan_a", { timeout: 10000 });

			// Extract subject links
			const subjects = await page.evaluate(() => {
				const links = document.querySelectorAll(".grupoplan_a");
				return Array.from(links).map((link) => ({
					name: link.textContent.trim(),
					href: link.href,
				}));
			});

			// Add to results with major info
			subjects.forEach((subject, index) => {
				allMaterias.push({
					"web-scraper-order": `${Date.now()}-${index}`,
					"web-scraper-start-url": url,
					materias: subject.name,
					"materias-href": subject.href,
				});
			});

			console.log(
				`✅ Found ${subjects.length} subjects for ${majorName}`
			);
		} catch (error) {
			console.error(
				`❌ Error processing ${majorName} data:`,
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
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	try {
		await browser.close();
	} catch (closeError) {
		console.warn("⚠️ Warning closing browser:", closeError.message);
		// Force close all browser processes
		if (browser && browser.process()) {
			browser.process().kill('SIGTERM');
		}
	}

	// Save to CSV
	const csvPath = path.resolve(__dirname, "..", "..", "materias.csv");
	const csvWriter = createObjectCsvWriter({
		path: csvPath,
		header: [
			{ id: "web-scraper-order", title: "web-scraper-order" },
			{ id: "web-scraper-start-url", title: "web-scraper-start-url" },
			{ id: "materias", title: "materias" },
			{ id: "materias-href", title: "materias-href" },
		],
	});

	await csvWriter.writeRecords(allMaterias);
	console.log(`📁 Saved ${allMaterias.length} materias to materias.csv`);

	// Also save as JSON for easier processing
	const jsonPath = path.resolve(__dirname, "..", "..", "materias.json");
	fs.writeFileSync(jsonPath, JSON.stringify(allMaterias, null, 2));
	console.log("📁 Saved materias.json");
	
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
	
	scrapeMaterias()
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

export default scrapeMaterias;

import scrapeMaterias from "./scrape-materias.js";
import scrapeSchedules from "./scrape-schedules.js";
import convertToJson from "./convert-to-json.js";

async function runFullScraping() {
	console.log("🚀 Starting full scraping process...");

	try {
		// Step 1: Scrape materias
		console.log("\n📚 Step 1: Scraping materias...");
		await scrapeMaterias();

		// Step 2: Scrape schedules
		console.log("\n📅 Step 2: Scraping schedules...");
		await scrapeSchedules();

		// Step 3: Convert to JSON
		console.log("\n🔄 Step 3: Converting to JSON...");
		await convertToJson();

		console.log("\n🎉 Full scraping process completed successfully!");
		console.log("📁 Generated files:");
		console.log("  - materias.csv");
		console.log("  - materias.json");
		console.log("  - [major].csv files");
		console.log("  - [major].json files");
	} catch (error) {
		console.error("❌ Error during scraping:", error);
		process.exit(1);
	}
}

// Run the full process
runFullScraping();

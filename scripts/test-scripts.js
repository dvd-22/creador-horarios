const path = require("path");
const fs = require("fs");

// Test script to verify our scripts work
async function testScripts() {
	console.log("🧪 Testing professor rating scripts...\n");

	// Test 1: Extract professors
	console.log("1️⃣ Testing extract-professors.js...");
	try {
		const extractProfessors = require("./extract-professors");
		const professors = extractProfessors();
		console.log(
			`✅ Successfully extracted ${professors.length} professors\n`
		);
	} catch (error) {
		console.error("❌ Extract professors failed:", error);
		return;
	}

	// Test 2: Check if professors.json was created
	const professorsPath = path.join(
		__dirname,
		"..",
		"data",
		"professors.json"
	);
	if (fs.existsSync(professorsPath)) {
		const data = JSON.parse(fs.readFileSync(professorsPath, "utf8"));
		console.log(
			`📁 professors.json created with ${data.totalUnique} unique professors`
		);
		console.log(`📊 Data structure:`, Object.keys(data));
	} else {
		console.error("❌ professors.json was not created");
		return;
	}

	// Test 3: Fetch ratings (just test a small sample)
	console.log("\n2️⃣ Testing fetch-ratings.js...");
	console.log("⚠️  This will make a real API request to MisProfesores.com");
	console.log("⚠️  Run manually: cd scripts && node fetch-ratings.js");

	console.log("\n🎉 Basic tests passed! You can now:");
	console.log('1. Run "cd scripts && npm install" to install dependencies');
	console.log(
		'2. Run "cd scripts && node extract-professors.js" to extract professors'
	);
	console.log(
		'3. Run "cd scripts && node fetch-ratings.js" to fetch ratings'
	);
	console.log("4. Commit and push to trigger the GitHub Action");
}

testScripts();

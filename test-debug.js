// Test the debug functions locally
import debugTest from "./netlify/functions/debug-test.js";
import professorDebug from "./netlify/functions/professor-debug.js";

async function runTests() {
	console.log("=== Running Debug Test ===");
	try {
		const debugResult = await debugTest.handler({}, {});
		console.log("Debug Test Result:", JSON.parse(debugResult.body));
	} catch (error) {
		console.error("Debug Test Error:", error);
	}

	console.log("\n=== Running Professor Debug Test ===");
	try {
		const profResult = await professorDebug.handler({}, {});
		console.log("Professor Debug Result:", JSON.parse(profResult.body));
	} catch (error) {
		console.error("Professor Debug Error:", error);
	}
}

runTests();

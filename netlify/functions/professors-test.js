// Minimal test function to check if deployment works
exports.handler = async (event, context) => {
	console.log("Function called with method:", event.httpMethod);

	const headers = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	};

	// Handle preflight requests
	if (event.httpMethod === "OPTIONS") {
		return {
			statusCode: 200,
			headers,
			body: "",
		};
	}

	if (event.httpMethod !== "POST") {
		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: "Method not allowed" }),
		};
	}

	try {
		const body = JSON.parse(event.body || "{}");
		const { professorNames } = body;

		console.log("Received professors:", professorNames?.length || 0);

		// Return null ratings for now - just to test if function works
		const results = professorNames?.map(() => null) || [];

		return {
			statusCode: 200,
			headers,
			body: JSON.stringify(results),
		};
	} catch (error) {
		console.error("Function error:", error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				error: "Internal server error",
				message: error.message,
				stack: error.stack,
			}),
		};
	}
};

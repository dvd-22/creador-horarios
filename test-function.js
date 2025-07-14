// Simple test for the professors function
const axios = require("axios");

const testFunction = async () => {
	try {
		console.log("Testing simple request...");

		const response = await axios.post(
			"http://localhost:8888/.netlify/functions/professors",
			{
				professorNames: ["Test Professor"],
			},
			{
				headers: {
					"Content-Type": "application/json",
				},
				timeout: 5000,
			}
		);

		console.log("Response status:", response.status);
		console.log("Response data:", response.data);
	} catch (error) {
		console.error("Error:", error.message);
		if (error.response) {
			console.error("Response status:", error.response.status);
			console.error("Response data:", error.response.data);
		}
	}
};

testFunction();

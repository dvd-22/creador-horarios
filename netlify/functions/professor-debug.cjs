const axios = require("axios");

exports.handler = async (event, context) => {
	console.log("Professor debug test started");

	try {
		// Test different approaches to find how the site works now

		console.log("Testing main site access...");
		const mainSiteResponse = await axios.get(
			"https://www.misprofesores.com",
			{
				timeout: 10000,
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
					"Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
				},
			}
		);

		console.log("Main site response status:", mainSiteResponse.status);
		console.log(
			"Main site response size:",
			mainSiteResponse.data?.length || 0
		);

		// Try to find if there's a search endpoint by looking at the homepage
		const homepageContent = mainSiteResponse.data || "";
		const hasSearchForm =
			homepageContent.includes("search") ||
			homepageContent.includes("buscar");
		const hasUniversityList =
			homepageContent.includes("universidades") ||
			homepageContent.includes("escuelas");

		console.log("Homepage analysis:");
		console.log("- Has search form:", hasSearchForm);
		console.log("- Has university list:", hasUniversityList);

		const result = {
			status: "success",
			timestamp: new Date().toISOString(),
			tests: {
				mainSite: {
					status: mainSiteResponse.status,
					size: mainSiteResponse.data?.length || 0,
					hasSearchForm,
					hasUniversityList,
				},
			},
			analysis: {
				siteAccessible: mainSiteResponse.status === 200,
				originalAPIBroken: true,
				needsNewApproach: true,
			},
		};

		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "Content-Type",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			},
			body: JSON.stringify(result, null, 2),
		};
	} catch (error) {
		console.error("Professor debug test error:", error);

		const errorDetails = {
			status: "error",
			message: error.message,
			code: error.code,
			response: error.response
				? {
						status: error.response.status,
						statusText: error.response.statusText,
						headers: error.response.headers,
				  }
				: null,
			timestamp: new Date().toISOString(),
		};

		return {
			statusCode: 500,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify(errorDetails, null, 2),
		};
	}
};

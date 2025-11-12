/**
 * URL Encoder/Decoder utility for schedule data
 * Uses ultra-minimal array format: [majorId, studyPlanId, groupId]
 * Full data is reconstructed by looking up the group in the JSON files
 */

// Compress schedule data to ultra-minimal format
export const compressScheduleData = (scheduleData) => {
	const compressed = {
		t: scheduleData.title, // title
		o: scheduleData.allowOverlap ? 1 : 0, // overlap (1/0 instead of true/false)
		// Each group is just [majorId, studyPlanId, groupId]
		g: scheduleData.groups.map((group) => [
			group.majorId,
			group.studyPlanId,
			group.group,
		]),
	};
	return compressed;
};

// Decompress schedule data from minimal format
// Note: This returns minimal group info - full data must be fetched from JSON files
export const decompressScheduleData = (compressed) => {
	return {
		title: compressed.t,
		allowOverlap: compressed.o === 1,
		// Returns minimal group info that can be used to look up full data
		groups: compressed.g.map((g) => ({
			majorId: g[0],
			studyPlanId: g[1],
			group: g[2],
		})),
	};
};

// Encode schedule data to URL-safe string
export const encodeScheduleToURL = (scheduleData) => {
	try {
		const compressed = compressScheduleData(scheduleData);
		const jsonString = JSON.stringify(compressed);
		// Use base64url encoding (URL-safe)
		const base64 = btoa(jsonString)
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, ""); // Remove padding
		return base64;
	} catch (error) {
		console.error("Failed to encode schedule:", error);
		return "";
	}
};

// Decode schedule data from URL-safe string
export const decodeScheduleFromURL = (encodedString) => {
	try {
		// Restore base64 padding and convert from base64url
		let base64 = encodedString.replace(/-/g, "+").replace(/_/g, "/");

		// Add padding if needed
		while (base64.length % 4) {
			base64 += "=";
		}

		const jsonString = atob(base64);
		const compressed = JSON.parse(jsonString);
		return decompressScheduleData(compressed);
	} catch (error) {
		console.error("Failed to decode schedule:", error);
		return null;
	}
};

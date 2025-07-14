class ProfessorRatingService {
	constructor() {
		this.cache = new Map();
		this.globalCache = new Map(); // Cache ratings for all professors
		this.cacheTimestamps = new Map(); // Track when data was cached
		this.cacheExpiryHours = 24; // Cache for 24 hours since ratings change daily
		this.loadingPromise = null; // Prevent multiple simultaneous loads
		// Netlify automatically provides the correct base URL
		this.baseUrl =
			window.location.hostname === "localhost"
				? "http://localhost:8888" // Netlify dev server
				: `https://${window.location.hostname}`;
	}

	// Check if cached data is still valid
	isCacheValid(professorName) {
		if (!this.cacheTimestamps.has(professorName)) return false;

		const cachedTime = this.cacheTimestamps.get(professorName);
		const now = Date.now();
		const hoursElapsed = (now - cachedTime) / (1000 * 60 * 60);

		return hoursElapsed < this.cacheExpiryHours;
	}

	// Fetch professors that aren't cached or are expired
	async fetchAndCacheProfessors(professorNames) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

			const response = await fetch(
				`${this.baseUrl}/.netlify/functions/professors`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ professorNames }),
					signal: controller.signal,
				}
			);

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(
					`HTTP ${response.status}: ${response.statusText}`
				);
			}

			const results = await response.json();

			// Cache all results globally with timestamps
			const now = Date.now();
			professorNames.forEach((name, index) => {
				if (name && results[index]) {
					this.globalCache.set(name, results[index]);
					this.cacheTimestamps.set(name, now);
				}
			});

			return results;
		} catch (error) {
			if (error.name === "AbortError") {
				console.warn("Professor ratings request timed out");
			} else {
				console.error("Error fetching professor ratings:", error);
			}
			return professorNames.map(() => null);
		}
	}

	// Main function to fetch professor ratings with improved logic
	async fetchProfessorRatings(professorNames) {
		if (!professorNames || professorNames.length === 0) return [];

		// Filter out professors that are already cached and valid
		const uncachedProfessors = professorNames.filter(
			(name) =>
				name &&
				(!this.globalCache.has(name) || !this.isCacheValid(name))
		);

		// If we have uncached professors, fetch them
		if (uncachedProfessors.length > 0) {
			await this.fetchAndCacheProfessors(uncachedProfessors);
		}

		// Return cached results for all requested professors
		return professorNames.map((name) =>
			name ? this.globalCache.get(name) || null : null
		);
	}

	// Get rating for a single professor - FIXED VERSION
	async getProfessorRating(professorName) {
		if (!professorName) return null;

		// Check if already cached and valid
		if (
			this.globalCache.has(professorName) &&
			this.isCacheValid(professorName)
		) {
			return this.globalCache.get(professorName);
		}

		// If loading promise exists, wait for it to complete
		if (this.loadingPromise) {
			await this.loadingPromise;
			// Check cache again after waiting
			if (
				this.globalCache.has(professorName) &&
				this.isCacheValid(professorName)
			) {
				return this.globalCache.get(professorName);
			}
		}

		// Start new loading if not already cached
		this.loadingPromise = this.fetchAndCacheProfessors([professorName]);
		await this.loadingPromise;
		this.loadingPromise = null;

		return this.globalCache.get(professorName) || null;
	}

	// Get color class based on rating
	getRatingColor(rating) {
		if (rating >= 8) return "text-green-400";
		if (rating >= 6) return "text-yellow-400";
		return "text-red-400";
	}

	// Get background color class based on rating
	getRatingBgColor(rating) {
		if (rating >= 8) return "bg-green-500";
		if (rating >= 6) return "bg-yellow-500";
		return "bg-red-500";
	}
}

// Export singleton instance
export const professorRatingService = new ProfessorRatingService();

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
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
				if (response.status === 400) {
					const errorData = await response.json().catch(() => ({}));
					if (errorData.maxAllowed) {
						throw new Error(
							`Batch too large: ${professorNames.length} professors, maximum ${errorData.maxAllowed} allowed`
						);
					}
				}
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

	// Main function to fetch professor ratings with chunked loading
	async fetchProfessorRatings(professorNames) {
		if (!professorNames || professorNames.length === 0) return [];

		// Filter out professors that are already cached and valid
		const uncachedProfessors = professorNames.filter(
			(name) =>
				name &&
				(!this.globalCache.has(name) || !this.isCacheValid(name))
		);

		// If we have uncached professors, fetch them in chunks
		if (uncachedProfessors.length > 0) {
			const CHUNK_SIZE = 50; // Process 50 professors at a time
			const chunks = [];

			for (let i = 0; i < uncachedProfessors.length; i += CHUNK_SIZE) {
				chunks.push(uncachedProfessors.slice(i, i + CHUNK_SIZE));
			}

			console.log(
				`Processing ${uncachedProfessors.length} professors in ${chunks.length} chunks of ${CHUNK_SIZE}`
			);

			// Process chunks sequentially to avoid overwhelming the server
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				console.log(
					`Processing chunk ${i + 1}/${chunks.length} (${
						chunk.length
					} professors)`
				);

				try {
					await this.fetchAndCacheProfessors(chunk);
					// Small delay between chunks to avoid rate limiting
					if (i < chunks.length - 1) {
						await new Promise((resolve) =>
							setTimeout(resolve, 500)
						);
					}
				} catch (error) {
					console.warn(`Error processing chunk ${i + 1}:`, error);
					// Continue with next chunk even if this one fails
				}
			}
		}

		// Return cached results for all requested professors
		return professorNames.map((name) =>
			name ? this.globalCache.get(name) || null : null
		);
	}

	// Get rating for a single professor - IMPROVED VERSION
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

		// Only start new loading if the professor wasn't included in a recent batch load
		// Check if we have ANY cached data (even if expired) to avoid redundant requests
		if (this.globalCache.has(professorName)) {
			// Return cached data even if expired, rather than making a new request
			return this.globalCache.get(professorName);
		}

		// Start new loading only if no cached data exists
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

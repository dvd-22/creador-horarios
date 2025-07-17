class ProfessorRatingService {
	constructor() {
		this.ratingsData = null;
		this.loadingPromise = null;
		this.isLoaded = false;
	}

	async loadStaticRatings() {
		if (this.isLoaded) {
			return this.ratingsData;
		}

		if (this.loadingPromise) {
			return this.loadingPromise;
		}

		this.loadingPromise = this.fetchStaticRatings();
		return this.loadingPromise;
	}

	async fetchStaticRatings() {
		try {
			console.log("📊 Loading static professor ratings...");

			// Fetch from the public/data folder (served by GitHub Pages)
			const response = await fetch("/data/ratings.json");

			if (!response.ok) {
				throw new Error(
					`HTTP ${response.status}: ${response.statusText}`
				);
			}

			this.ratingsData = await response.json();
			this.isLoaded = true;

			console.log(
				`✅ Loaded ${
					this.ratingsData.ratingsFound || 0
				} professor ratings`
			);
			console.log(
				`📅 Last updated: ${new Date(
					this.ratingsData.lastUpdated
				).toLocaleDateString()}`
			);

			return this.ratingsData;
		} catch (error) {
			console.warn("⚠️ Failed to load static ratings:", error);
			this.ratingsData = {
				ratings: {},
				lastUpdated: new Date().toISOString(),
				totalProfessors: 0,
				ratingsFound: 0,
			};
			this.isLoaded = true;
			return this.ratingsData;
		}
	}

	async getProfessorRating(professorName) {
		if (!professorName) return null;

		// Ensure ratings are loaded
		if (!this.isLoaded) {
			await this.loadStaticRatings();
		}

		// Direct lookup from static data
		const rating = this.ratingsData.ratings[professorName];
		return rating || null;
	}

	async fetchProfessorRatings(professorNames) {
		if (!professorNames || professorNames.length === 0) return [];

		// Ensure ratings are loaded
		if (!this.isLoaded) {
			await this.loadStaticRatings();
		}

		// Return ratings for all requested professors
		return professorNames.map((name) =>
			name ? this.ratingsData.ratings[name] || null : null
		);
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

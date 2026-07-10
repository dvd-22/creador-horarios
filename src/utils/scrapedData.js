const SCRAPED_MAJOR_FILES = {
	cs: 'data/ciencias-computacion.json',
	math: 'data/matematicas.json',
	physics: 'data/fisica.json',
	'ap-math': 'data/matematicas-aplicadas.json',
	actuary: 'data/actuaria.json',
	'bio-physics': 'data/fisica-biomedica.json',
	'biology-1997': 'data/biologia-1997.json',
	'biology-2025': 'data/biologia-2025.json',
}

const getScrapedDataUrl = (relativePath) => {
	return `${import.meta.env.BASE_URL}${relativePath}`
}

export const fetchScrapedJson = async (relativePath) => {
	const response = await fetch(getScrapedDataUrl(relativePath))

	if (!response.ok) {
		throw new Error(`Failed to load ${relativePath}: HTTP ${response.status}`)
	}

	return response.json()
}

export const loadScrapedMajorData = async (majorId, studyPlanId = null) => {
	let dataKey = majorId
	if (majorId === 'biology' && studyPlanId) {
		dataKey = `biology-${studyPlanId}`
	}

	const filePath = SCRAPED_MAJOR_FILES[dataKey]
	if (!filePath) {
		throw new Error(`No scraped data file configured for ${dataKey}`)
	}

	return fetchScrapedJson(filePath)
}

export const loadAllScrapedData = async () => {
	return Promise.all(Object.values(SCRAPED_MAJOR_FILES).map(fetchScrapedJson))
}

export { SCRAPED_MAJOR_FILES }
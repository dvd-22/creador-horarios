# Schedule Scraping System

This system automates the scraping of UNAM schedule data for all majors.

## How it works

### 1. **Scrape Materias** (`scrape-materias.js`)
- Scrapes all subject links from each major's index page
- Generates `materias.csv` and `materias.json` with all subject URLs

### 2. **Scrape Schedules** (`scrape-schedules.js`)
- Uses the materias data to scrape individual subject pages
- Generates CSV files for each major with schedule data
- Files: `actuaria.csv`, `ciencias-computacion.csv`, etc.

### 3. **Convert to JSON** (`convert-to-json.js`)
- Converts CSV files to the JSON format used by your application
- Applies data cleaning and formatting
- Generates final JSON files: `actuaria.json`, `ciencias-computacion.json`, etc.

## Usage

### Local Testing
```bash
cd scripts/scraping
npm install
node test-scraping.js
```

### GitHub Actions
The workflow runs automatically:
- **Schedule**: Every semester (January 1st and August 1st)
- **Manual**: Via "Run workflow" button in GitHub Actions
- **On push**: When scraping scripts are modified

## Configuration

### Major Mappings
Edit the `MAJORS_CONFIG` in both `scrape-materias.js` and `scrape-schedules.js`:

```javascript
const MAJORS_CONFIG = {
  "https://...": "major-name",
  // ...
};
```

### Semester Updates
Update the URLs in `MAJORS_CONFIG` when semester changes:
- Current: `20261` (2025-1)
- Next: `20262` (2025-2)

## Files Generated
- `materias.csv` - All subjects from all majors
- `materias.json` - JSON version of materias
- `[major].csv` - Schedule data for each major
- `[major].json` - Final JSON files for your application

## Error Handling
- Timeouts for slow pages
- Individual subject failures don't stop the entire process
- Detailed logging for debugging

## Notes
- Uses Puppeteer for web scraping
- Runs in headless mode for GitHub Actions
- Respects rate limits with delays between requests
- Handles dynamic content loading

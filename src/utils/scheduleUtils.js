/**
 * Sanitizes filename by removing invalid characters
 * @param {string} name - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFileName = (name) => {
	return name.replace(/[^a-z0-9]/gi, "_");
};

/**
 * Saves schedule as PNG image
 * @param {React.RefObject} scheduleRef - Reference to schedule component
 * @param {string} name - Schedule name
 * @param {Object} options - Optional rendering settings
 * @returns {Promise<void>}
 */
export const saveScheduleAsPng = async (scheduleRef, name, options = {}) => {
	if (!scheduleRef?.current) {
		throw new Error("Invalid schedule reference");
	}

	if (!name || typeof name !== "string") {
		throw new Error("Invalid schedule name");
	}

	const { quality = 1.0, scale = 2, backgroundColor = "#111827" } = options;

	try {
		const html2canvas = (await import("html2canvas")).default;

		// Store original positioning
		const originalTop = scheduleRef.current.style.top;
		const originalVisibility = scheduleRef.current.style.visibility;

		// Store original styles of time-group-card elements
		const elements =
			scheduleRef.current.getElementsByClassName("time-group-card");
		const originalStyles = Array.from(elements).map((el) => ({
			el,
			zIndex: el.style.zIndex,
			fontSize: el.style.fontSize,
			overflow: el.style.overflow,
		}));

		// Temporarily move element on-screen and make visible for capture
		scheduleRef.current.style.top = "0";
		scheduleRef.current.style.visibility = "visible";

		// Apply export styles
		originalStyles.forEach(({ el }) => {
			el.style.zIndex = "999";
			el.style.fontSize = "12px";
			el.style.overflow = "visible";
		});

		// Ensure layout is rendered before capture
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Calculate dynamic height based on actual content
		const actualHeight = scheduleRef.current.scrollHeight;
		const width = 1400;
		// Use the larger of: 800px (minimum) or actual content height
		const height = Math.max(800, actualHeight);

		const canvas = await html2canvas(scheduleRef.current, {
			backgroundColor,
			scale,
			width,
			height,
			logging: false,
			useCORS: true,
			allowTaint: true,
			foreignObjectRendering: true,
			removeContainer: false,
		});

		// Restore original styles
		originalStyles.forEach(({ el, zIndex, fontSize, overflow }) => {
			el.style.zIndex = zIndex;
			el.style.fontSize = fontSize;
			el.style.overflow = overflow;
		});

		// Restore original positioning
		scheduleRef.current.style.top = originalTop;
		scheduleRef.current.style.visibility = originalVisibility;

		const link = document.createElement("a");
		const sanitizedName = sanitizeFileName(name);
		link.download = `${sanitizedName}.png`;
		link.href = canvas.toDataURL("image/png", quality);

		// Trigger download
		document.body.appendChild(link);
		link.click();

		// Cleanup
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);
	} catch (error) {
		console.error("Error saving schedule:", error);
		throw new Error(`Failed to save schedule: ${error.message}`);
	}
};

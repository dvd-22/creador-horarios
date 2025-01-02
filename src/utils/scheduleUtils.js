export const saveScheduleAsPng = async (scheduleRef, name) => {
	try {
		const html2canvas = (await import("html2canvas")).default;
		const canvas = await html2canvas(scheduleRef.current, {
			backgroundColor: "#111827", // matches bg-gray-900
			scale: 2, // Higher quality
		});

		const link = document.createElement("a");
		link.download = `${name}.png`;
		link.href = canvas.toDataURL("image/png");
		link.click();
	} catch (error) {
		console.error("Error saving schedule:", error);
	}
};

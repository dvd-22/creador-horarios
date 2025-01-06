export const saveScheduleAsPng = async (scheduleRef, name) => {
	try {
	  const html2canvas = (await import("html2canvas")).default;
	  
	  // Show export layout
	  scheduleRef.current.style.display = 'block';
	  
	  const canvas = await html2canvas(scheduleRef.current, {
		backgroundColor: "#111827",
		scale: 2,
		width: 1400,
		height: 800,
		logging: false,
		useCORS: true
	  });
	  
	  // Hide export layout
	  scheduleRef.current.style.display = 'none';
	  
	  const link = document.createElement("a");
	  link.download = `${name}.png`;
	  link.href = canvas.toDataURL("image/png", 1.0);
	  link.click();
	} catch (error) {
	  console.error("Error saving schedule:", error);
	}
  };
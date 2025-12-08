import React, { useState, useMemo, useEffect } from "react";
import { createEvents } from "ics";
import { useMajorContext } from "../contexts/MajorContext";
import { Edit2, Download, X } from "lucide-react";
import ProfessorRating from "./ProfessorRating";
import { professorRatingService } from "../services/professorRatingService";

const GOOGLE_COLORS = {
  LAVENDER: 1,
  SAGE: 2,
  GRAPE: 3,
  FLAMINGO: 4,
  BANANA: 5,
  TANGERINE: 6,
  PEACOCK: 7,
  GRAPHITE: 8,
  BLUEBERRY: 9,
  BASIL: 10,
  TOMATO: 11,
};

const parseTimeString = (timeStr) => {
  if (!timeStr || timeStr === "Horario no especificado") return null;

  // Handle format "HH:MM a HH:MM"
  if (timeStr.includes("a")) {
    const [startTime, endTime] = timeStr.split("a").map((t) => t.trim());
    return {
      start: timeToMinutes(startTime),
      end: timeToMinutes(endTime),
    };
  }

  // Handle format "HH:MM - HH:MM"
  if (timeStr.includes("-")) {
    const [startTime, endTime] = timeStr.split("-").map((t) => t.trim());
    return {
      start: timeToMinutes(startTime),
      end: timeToMinutes(endTime),
    };
  }

  return null;
};

const timeToMinutes = (time) => {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const SelectedGroupsPanel = ({
  selectedGroups,
  spacers = [],
  onRemoveGroup,
  onSaveSchedule,
  setShowSavePopup,
  scheduleTitle,
  onTitleChange,
  isMobile = false,
  showOnlyHeader = false,
  showOnlySubjects = false,
  horizontal = false,
  showSubjectsCount = false,
  onRevealGroup,
}) => {
  const { availableMajors } = useMajorContext();
  const [isNaming, setIsNaming] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(scheduleTitle);
  const [professorRatings, setProfessorRatings] = useState({});
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Fetch ratings for all professors
  useEffect(() => {
    const fetchRatings = async () => {
      const ratings = {};
      for (const group of selectedGroups) {
        if (
          group.professor?.nombre &&
          !professorRatings[group.professor.nombre]
        ) {
          try {
            const result = await professorRatingService.getProfessorRating(
              group.professor.nombre
            );
            if (result) {
              ratings[group.professor.nombre] = result;
            }
          } catch (error) {
            console.error(
              "Error fetching rating for",
              group.professor.nombre,
              error
            );
          }
        }
      }
      if (Object.keys(ratings).length > 0) {
        setProfessorRatings((prev) => ({ ...prev, ...ratings }));
      }
    };

    fetchRatings();
  }, [selectedGroups]);

  // Color palette that matches ScheduleViewer
  const colorPalette = [
    "bg-blue-700/50",
    "bg-purple-700/50",
    "bg-green-700/50",
    "bg-red-700/50",
    "bg-yellow-700/50",
    "bg-indigo-700/50",
    "bg-pink-700/50",
    "bg-cyan-700/50",
    "bg-teal-700/50",
    "bg-orange-700/50",
    "bg-lime-700/50",
    "bg-emerald-700/50",
    "bg-sky-700/50",
    "bg-violet-700/50",
    "bg-rose-700/50",
    "bg-amber-700/50",
    "bg-fuchsia-700/50",
    "bg-blue-600/50",
    "bg-purple-600/50",
    "bg-green-600/50",
  ];

  // Convert Tailwind color classes to CSS colors for color bars
  const getColorFromClass = (colorClass) => {
    const colorMap = {
      "bg-blue-700/50": "#1d4ed8",
      "bg-purple-700/50": "#7c3aed",
      "bg-green-700/50": "#15803d",
      "bg-red-700/50": "#b91c1c",
      "bg-yellow-700/50": "#a16207",
      "bg-indigo-700/50": "#4338ca",
      "bg-pink-700/50": "#be185d",
      "bg-cyan-700/50": "#0e7490",
      "bg-teal-700/50": "#0f766e",
      "bg-orange-700/50": "#c2410c",
      "bg-lime-700/50": "#4d7c0f",
      "bg-emerald-700/50": "#047857",
      "bg-sky-700/50": "#0369a1",
      "bg-violet-700/50": "#6d28d9",
      "bg-rose-700/50": "#be123c",
      "bg-amber-700/50": "#b45309",
      "bg-fuchsia-700/50": "#a21caf",
      "bg-blue-600/50": "#2563eb",
      "bg-purple-600/50": "#9333ea",
      "bg-green-600/50": "#16a34a",
    };
    return colorMap[colorClass] || "#6b7280";
  };

  const subjectColors = useMemo(() => {
    const uniqueSubjects = [
      ...new Set(selectedGroups.map((group) => group.subject)),
    ];
    return Object.fromEntries(
      uniqueSubjects.map((subject, index) => [
        subject,
        colorPalette[index % colorPalette.length],
      ])
    );
  }, [selectedGroups, colorPalette]);

  const handleSave = () => {
    setShowDownloadModal(false);
    onSaveSchedule(scheduleTitle);
    setShowSavePopup(true); // Show disclaimer modal
  };

  const handleTitleEdit = () => {
    setTempTitle(scheduleTitle);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(scheduleTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      handleTitleCancel();
    }
  };

  const handleExportICS = () => {
    setShowDownloadModal(false);

    const events = [];
    const dayOffsets = { Lu: 0, Ma: 1, Mi: 2, Ju: 3, Vi: 4, Sa: 5 };

    // Semester 2026-2: February 3, 2026 to May 29, 2026
    // February 3, 2026 is a Tuesday, so we need to find the Monday before it (February 2)
    const semesterStartMonday = new Date(2026, 1, 2); // February 2, 2026 (month is 0-indexed)
    const semesterEnd = new Date(2026, 4, 29); // May 29, 2026

    // Calculate number of weeks in semester (17 weeks from Feb 2 to May 29)
    const weekCount = 17;

    selectedGroups.forEach((group, groupIndex) => {
      const color = subjectColors[group.subject];

      // Process professor schedules
      group.professor.horarios?.forEach((schedule) => {
        const timeRange = parseTimeString(schedule.horario);
        if (timeRange && schedule.dias) {
          schedule.dias.forEach((day) => {
            const dayOffset = dayOffsets[day];
            if (dayOffset !== undefined) {
              const eventDate = new Date(semesterStartMonday);
              eventDate.setDate(semesterStartMonday.getDate() + dayOffset);

              const startDateTime = new Date(eventDate);
              const endDateTime = new Date(eventDate);

              startDateTime.setHours(
                Math.floor(timeRange.start / 60),
                timeRange.start % 60,
                0,
                0
              );
              endDateTime.setHours(
                Math.floor(timeRange.end / 60),
                timeRange.end % 60,
                0,
                0
              );

              events.push({
                title: `${group.subject} (${group.group})`,
                description: `Profesor: ${group.professor.nombre}\nAyudantes: ${group.assistants?.map((a) => a.nombre).join(", ") || "N/A"
                  }`,
                start: [
                  startDateTime.getFullYear(),
                  startDateTime.getMonth() + 1,
                  startDateTime.getDate(),
                  startDateTime.getHours(),
                  startDateTime.getMinutes(),
                ],
                startInputType: 'local',
                startOutputType: 'utc',
                end: [
                  endDateTime.getFullYear(),
                  endDateTime.getMonth() + 1,
                  endDateTime.getDate(),
                  endDateTime.getHours(),
                  endDateTime.getMinutes(),
                ],
                endInputType: 'local',
                endOutputType: 'utc',
                location: group.salon || group.modalidad || "",
                categories: [group.subject],
                status: "CONFIRMED",
                busyStatus: "BUSY",
                recurrenceRule: `FREQ=WEEKLY;UNTIL=20260530T055959Z`,
              });
            }
          });
        }
      });

      // Process assistants schedules
      group.assistants?.forEach((assistant) => {
        const timeRange = parseTimeString(assistant.horario);
        if (timeRange && assistant.dias) {
          assistant.dias.forEach((day) => {
            const dayOffset = dayOffsets[day];
            if (dayOffset !== undefined) {
              const eventDate = new Date(semesterStartMonday);
              eventDate.setDate(semesterStartMonday.getDate() + dayOffset);

              const startDateTime = new Date(eventDate);
              const endDateTime = new Date(eventDate);

              startDateTime.setHours(
                Math.floor(timeRange.start / 60),
                timeRange.start % 60,
                0,
                0
              );
              endDateTime.setHours(
                Math.floor(timeRange.end / 60),
                timeRange.end % 60,
                0,
                0
              );

              events.push({
                title: `${group.subject} (${group.group}) - Ayudantía`,
                description: `Ayudante: ${assistant.nombre}`,
                start: [
                  startDateTime.getFullYear(),
                  startDateTime.getMonth() + 1,
                  startDateTime.getDate(),
                  startDateTime.getHours(),
                  startDateTime.getMinutes(),
                ],
                startInputType: 'local',
                startOutputType: 'utc',
                end: [
                  endDateTime.getFullYear(),
                  endDateTime.getMonth() + 1,
                  endDateTime.getDate(),
                  endDateTime.getHours(),
                  endDateTime.getMinutes(),
                ],
                endInputType: 'local',
                endOutputType: 'utc',
                location: assistant.salon || "",
                categories: [group.subject],
                status: "CONFIRMED",
                busyStatus: "BUSY",
                recurrenceRule: `FREQ=WEEKLY;UNTIL=20260530T055959Z`,
              });
            }
          });
        }
      });
    });

    // Add spacers to calendar
    spacers.forEach((spacer) => {
      const dayOffsets = { L: 0, M: 1, I: 2, J: 3, V: 4, S: 5 };
      const timeRange = parseTimeString(`${spacer.startTime} a ${spacer.endTime}`);

      if (timeRange && spacer.days) {
        spacer.days.forEach((day) => {
          const dayOffset = dayOffsets[day];
          if (dayOffset !== undefined) {
            const eventDate = new Date(semesterStartMonday);
            eventDate.setDate(semesterStartMonday.getDate() + dayOffset);

            const startDateTime = new Date(eventDate);
            const endDateTime = new Date(eventDate);

            startDateTime.setHours(
              Math.floor(timeRange.start / 60),
              timeRange.start % 60,
              0,
              0
            );
            endDateTime.setHours(
              Math.floor(timeRange.end / 60),
              timeRange.end % 60,
              0,
              0
            );

            events.push({
              title: spacer.name,
              description: "Horario personal",
              start: [
                startDateTime.getFullYear(),
                startDateTime.getMonth() + 1,
                startDateTime.getDate(),
                startDateTime.getHours(),
                startDateTime.getMinutes(),
              ],
              startInputType: 'local',
              startOutputType: 'utc',
              end: [
                endDateTime.getFullYear(),
                endDateTime.getMonth() + 1,
                endDateTime.getDate(),
                endDateTime.getHours(),
                endDateTime.getMinutes(),
              ],
              endInputType: 'local',
              endOutputType: 'utc',
              location: "",
              categories: [spacer.name],
              status: "CONFIRMED",
              busyStatus: "BUSY",
              recurrenceRule: `FREQ=WEEKLY;UNTIL=20260530T055959Z`,
            });
          }
        });
      }
    });

    createEvents(events, (error, value) => {
      if (error) {
        console.error("Error creating ICS file:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Events that caused error:", events);
        alert("Error al crear el archivo ICS. Por favor verifica la consola.");
        return;
      }

      const blob = new Blob([value], { type: "text/calendar;charset=utf-8" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute("download", `${scheduleTitle || "horario"}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Show disclaimer modal after download starts
      setShowSavePopup(true);
    });
  };

  const handleShareSchedule = () => {
    const url = window.location.href;

    console.log("handleShareSchedule called", {
      isMobile,
      hasNavigatorShare: !!navigator.share,
    });

    // First, always try to copy to clipboard
    navigator.clipboard
      .writeText(url)
      .then(() => {
        console.log("Copied to clipboard successfully");

        // Then show native share if available on mobile
        if (navigator.share && isMobile) {
          console.log("Attempting native share...");
          navigator
            .share({
              title: scheduleTitle,
              text: `Mira mi horario: ${scheduleTitle}`,
              url: url,
            })
            .then(() => {
              console.log("Share successful");
            })
            .catch((err) => {
              console.log("Share error or cancelled:", err);
            })
            .finally(() => {
              // Always show modal after share attempt
              setShowDownloadModal(false);
              setShowSavePopup(true);
            });
        } else {
          // Desktop: just show modal
          console.log("Desktop mode - showing modal");
          setShowDownloadModal(false);
          setShowSavePopup(true);
        }
      })
      .catch((err) => {
        console.error("Error copying to clipboard:", err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          console.log("Copied using fallback method");
          setShowDownloadModal(false);
          setShowSavePopup(true);
        } catch (e) {
          console.error("Fallback copy failed:", e);
          alert("Error al copiar el link");
        }
        document.body.removeChild(textArea);
      });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setShowDownloadModal(false);
        setShowSavePopup(true); // Show disclaimer modal
      })
      .catch((err) => {
        console.error("Error copying to clipboard:", err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          setShowDownloadModal(false);
          setShowSavePopup(true); // Show disclaimer modal
        } catch (e) {
          alert("Error al copiar el link");
        }
        document.body.removeChild(textArea);
      });
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      console.log("Link copied successfully");
      setShowDownloadModal(false);
      setShowSavePopup(true);
    } catch (err) {
      console.error("Failed to copy link:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Link copied with fallback method");
        setShowDownloadModal(false);
        setShowSavePopup(true);
      } catch (e) {
        console.error("Fallback copy failed:", e);
        alert("Error al copiar el link");
      }
      document.body.removeChild(textArea);
    }
  };

  if (isMobile) {
    // Mobile header only (title and buttons)
    if (showOnlyHeader) {
      return (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-hidden">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyPress}
                  className="bg-gray-800 text-white px-2 py-1 rounded text-sm w-full border border-gray-600 focus:border-blue-500 outline-none"
                  autoFocus
                />
              ) : (
                <div
                  onClick={handleTitleEdit}
                  className="flex items-center cursor-pointer group"
                >
                  <p className="text-white font-medium text-sm truncate flex-1 min-w-0">
                    {scheduleTitle.length > 25
                      ? scheduleTitle.slice(0, 25) + "..."
                      : scheduleTitle}
                  </p>
                  <div className="ml-2 text-gray-400 group-hover:text-white p-1 flex-shrink-0 transition-colors">
                    <Edit2 size={12} />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs whitespace-nowrap flex items-center justify-center flex-shrink-0"
            >
              <Download size={16} />
            </button>
          </div>

          {/* Download Modal */}
          {showDownloadModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDownloadModal(false)}
            >
              <div
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-gray-700"
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-100">
                    Descargar Horario
                  </h2>
                  <button
                    onClick={() => setShowDownloadModal(false)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-100 flex items-center justify-center"
                    aria-label="Cerrar"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <p className="text-gray-300 text-sm mb-4 text-center">
                    Puedes copiar el link para compartir tu horario con tus
                    amigos, guardarlo como imagen, o exportar a ics para poder
                    importar a tu calendario favorito
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={handleCopyLink}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleCopyLink();
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                      style={{ touchAction: "manipulation" }}
                    >
                      Copiar Link
                    </button>
                    <button
                      onClick={handleSave}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleSave();
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                      style={{ touchAction: "manipulation" }}
                    >
                      Guardar como PNG
                    </button>
                    <button
                      onClick={handleExportICS}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleExportICS();
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                      style={{ touchAction: "manipulation" }}
                    >
                      Exportar .ics
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    // Mobile subjects only (horizontal chips)
    if (showOnlySubjects && horizontal) {
      return (
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {selectedGroups.map((group, index) => {
            const colorClass = subjectColors[group.subject];
            const colorHex = getColorFromClass(colorClass);

            return (
              <div
                key={`${group.semester}-${group.subject}-${group.group}`}
                className="flex-shrink-0 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden flex items-stretch"
              >
                {/* Color Bar - takes full height */}
                <div
                  className="w-1 flex-shrink-0"
                  style={{ backgroundColor: colorHex }}
                />

                {/* Content */}
                <div className="px-3 py-2 flex items-center space-x-2">
                  <div className="text-xs whitespace-nowrap">
                    <span className="text-white font-medium">
                      {group.subject}
                    </span>
                    <button
                      onClick={() =>
                        onRevealGroup &&
                        onRevealGroup(
                          group.majorId,
                          group.studyPlanId,
                          group.semester,
                          group.subject,
                          group.group
                        )
                      }
                      className="text-gray-400 hover:text-gray-300 ml-1 transition-colors"
                      title="Ver en selector de materias"
                    >
                      ({group.group})
                    </button>
                  </div>

                  {/* Action buttons container */}
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {group.professor.nombre && (
                      <button
                        onClick={() => {
                          const ratingData =
                            professorRatings[group.professor.nombre];
                          if (ratingData?.url) {
                            window.open(
                              ratingData.url,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }
                        }}
                        className={`text-white text-[10px] h-4 px-1 flex items-center justify-center flex-shrink-0 rounded font-medium ${professorRatings[group.professor.nombre]?.rating
                          ? professorRatingService.getRatingBgColor(
                            professorRatings[group.professor.nombre].rating
                          )
                          : "bg-gray-600"
                          }`}
                        title={
                          professorRatings[group.professor.nombre]?.rating
                            ? `Calificación: ${professorRatings[group.professor.nombre].rating
                            }/10`
                            : "Cargando calificación..."
                        }
                      >
                        {professorRatings[group.professor.nombre]?.rating ||
                          "..."}
                      </button>
                    )}

                    {group.presentacion && (
                      <button
                        onClick={() =>
                          window.open(
                            group.presentacion,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-4 w-4 flex items-center justify-center flex-shrink-0 rounded"
                        title="Ver presentación"
                      >
                        📄
                      </button>
                    )}

                    <button
                      onClick={() =>
                        onRemoveGroup(
                          group.semester,
                          group.subject,
                          group.group,
                          {
                            profesor: group.professor,
                            ayudantes: group.assistants,
                          }
                        )
                      }
                      className="text-red-400 hover:text-red-300 text-xs h-4 w-4 flex items-center justify-center flex-shrink-0"
                      title="Eliminar materia"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {selectedGroups.length === 0 && (
            <div className="text-gray-500 text-sm italic whitespace-nowrap">
              Ninguna materia seleccionada
            </div>
          )}
        </div>
      );
    }

    // Original mobile layout (vertical) - keeping as fallback
    return (
      <div className="flex flex-col h-full bg-gray-900 text-white">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            {/* Schedule Title */}
            <div className="flex items-center flex-1 min-w-0">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyPress}
                  className="bg-gray-800 text-white px-2 py-1 rounded text-sm flex-1 border border-gray-600 focus:border-blue-500 outline-none"
                  autoFocus
                />
              ) : (
                <div
                  onClick={handleTitleEdit}
                  className="flex items-center flex-1 min-w-0 cursor-pointer group"
                >
                  <span className="text-white font-medium text-sm truncate">
                    {scheduleTitle}
                  </span>
                  <div className="ml-2 text-gray-400 group-hover:text-white p-1 flex-shrink-0 transition-colors">
                    <Edit2 size={12} />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs whitespace-nowrap"
              >
                Guardar
              </button>
              <button
                onClick={handleExportICS}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs whitespace-nowrap"
              >
                .ics
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Selected Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-2">
            {selectedGroups.map((group, index) => {
              const colorClass = subjectColors[group.subject];
              const colorHex = getColorFromClass(colorClass);

              return (
                <div
                  key={`${group.semester}-${group.subject}-${group.group}`}
                  className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden flex"
                >
                  {/* Color Bar */}
                  <div
                    className="w-1 flex-shrink-0"
                    style={{ backgroundColor: colorHex }}
                  />

                  {/* Content */}
                  <div className="flex-1 px-3 py-2 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <span className="text-white font-medium">
                          {group.subject}
                        </span>
                        <button
                          onClick={() =>
                            onRevealGroup &&
                            onRevealGroup(
                              group.majorId,
                              group.studyPlanId,
                              group.semester,
                              group.subject,
                              group.group
                            )
                          }
                          className="text-gray-400 hover:text-gray-300 ml-1 transition-colors"
                          title="Ver en selector de materias"
                        >
                          ({group.group})
                        </button>
                      </div>
                      {group.professor.nombre && (
                        <div className="text-xs text-gray-400 truncate mt-1 flex items-center gap-2">
                          <span>{group.professor.nombre}</span>
                          <ProfessorRating
                            professorName={group.professor.nombre}
                            className="text-xs"
                            compact={true}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        onRemoveGroup(
                          group.semester,
                          group.subject,
                          group.group,
                          {
                            profesor: group.professor,
                            ayudantes: group.assistants,
                          }
                        )
                      }
                      className="text-red-400 hover:text-red-300 text-xs h-6 w-6 flex items-center justify-center flex-shrink-0 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            {selectedGroups.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm italic">
                  Aún no has seleccionado materias
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Download Modal */}
        {showDownloadModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDownloadModal(false)}
          >
            <div
              className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-gray-700"
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-100">
                  Descargar Horario
                </h2>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-100 flex items-center justify-center"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <p className="text-gray-300 text-sm mb-4 text-center">
                  Puedes copiar el link para compartir tu horario con tus
                  amigos, guardarlo como imagen, o exportar a ics para poder
                  importar a tu calendario favorito
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleCopyLink}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleCopyLink();
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                    style={{ touchAction: "manipulation" }}
                  >
                    Copiar Link
                  </button>
                  <button
                    onClick={handleSave}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSave();
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                    style={{ touchAction: "manipulation" }}
                  >
                    Guardar como PNG
                  </button>
                  <button
                    onClick={handleExportICS}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleExportICS();
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                    style={{ touchAction: "manipulation" }}
                  >
                    Exportar .ics
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } // Desktop vertical layout (existing code)
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyPress}
                className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none flex-1"
                autoFocus
              />
            ) : (
              <div
                onClick={handleTitleEdit}
                className="flex items-center flex-1 min-w-0 cursor-pointer group"
              >
                <h2 className="text-lg font-semibold text-white truncate">
                  {scheduleTitle}
                </h2>
                <div className="ml-2 text-gray-400 group-hover:text-white p-1 rounded flex-shrink-0 transition-colors">
                  <Edit2 size={16} />
                </div>
              </div>
            )}
          </div>

          {/* Download button */}
          <button
            onClick={() => setShowDownloadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors flex items-center justify-center flex-shrink-0"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Selected Groups List */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="font-medium text-gray-300 mb-3">
          Materias seleccionadas ({selectedGroups.length})
        </h3>
        {selectedGroups.map((group, index) => {
          const majorInfo = Object.values(availableMajors).find(
            (m) => m.id === group.semester
          );
          const colorClass = subjectColors[group.subject];
          const colorHex = getColorFromClass(colorClass);

          return (
            <div
              key={`${group.semester}-${group.subject}-${group.group}`}
              className="mb-3 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors flex"
            >
              {/* Color Bar */}
              <div
                className="w-1 flex-shrink-0"
                style={{ backgroundColor: colorHex }}
              />

              {/* Content */}
              <div className="flex-1">
                {/* Header with subject name and remove button */}
                <div className="bg-gray-800 px-3 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Subject Title */}
                      <div className="font-medium text-white text-sm mb-1 break-words">
                        {group.subject}
                      </div>
                      {/* Professor */}
                      {group.professor.nombre && (
                        <div className="text-xs text-gray-400 truncate">
                          {group.professor.nombre}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        onRemoveGroup(
                          group.semester,
                          group.subject,
                          group.group,
                          {
                            profesor: group.professor,
                            ayudantes: group.assistants,
                          }
                        )
                      }
                      className="text-red-400 hover:text-red-300 text-xs h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-700 ml-2"
                      aria-label="Eliminar materia"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Separating line and bottom section */}
                <div className="border-t border-gray-700">
                  <div className="px-3 py-2 flex items-center justify-between">
                    {/* Group info */}
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() =>
                          onRevealGroup &&
                          onRevealGroup(
                            group.majorId,
                            group.studyPlanId,
                            group.semester,
                            group.subject,
                            group.group
                          )
                        }
                        className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300 transition-colors cursor-pointer"
                        title="Ver en selector de materias"
                      >
                        Grupo {group.group}
                      </button>
                      {group.professor.nombre && (
                        <ProfessorRating
                          professorName={group.professor.nombre}
                          className="text-xs"
                        />
                      )}
                    </div>

                    {/* Presentation button */}
                    {group.presentacion && (
                      <button
                        onClick={() =>
                          window.open(
                            group.presentacion,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
                        <span className="mr-1">📄</span>
                        Presentación
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {selectedGroups.length === 0 && (
          <p className="text-gray-500 text-center text-sm italic">
            Aún no has seleccionado materias
          </p>
        )}
      </div>

      <div className="mt-4 text-center text-sm text-gray-400 px-4 pb-4">
        Con ♥️ por Dvd22 -{" "}
        <a
          href="https://github.com/dvd-22/creador-horarios"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300"
        >
          Contribuye
        </a>
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDownloadModal(false)}
        >
          <div
            className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col border border-gray-700"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-100">
                Descargar Horario
              </h2>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-gray-100 flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <p className="text-gray-300 text-sm mb-4 text-center">
                Puedes copiar el link para compartir tu horario con tus amigos,
                guardarlo como imagen, o exportar a ics para poder importar a tu
                calendario favorito
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleCopyLink}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleCopyLink();
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                  style={{ touchAction: "manipulation" }}
                >
                  Copiar Link
                </button>
                <button
                  onClick={handleSave}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                  style={{ touchAction: "manipulation" }}
                >
                  Guardar como PNG
                </button>
                <button
                  onClick={handleExportICS}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleExportICS();
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-2 px-4 rounded-lg transition-colors touch-manipulation"
                  style={{ touchAction: "manipulation" }}
                >
                  Exportar .ics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectedGroupsPanel;

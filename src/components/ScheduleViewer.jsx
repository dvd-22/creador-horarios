import React, { useMemo } from 'react';
import { Edit2 } from 'lucide-react';

const parseTimeString = (timeStr) => {
  if (!timeStr || timeStr === 'Horario no especificado') return null;

  // Handle format "HH:MM a HH:MM"
  if (timeStr.includes('a')) {
    const [startTime, endTime] = timeStr.split('a').map(t => t.trim());
    return {
      start: timeToMinutes(startTime),
      end: timeToMinutes(endTime)
    };
  }

  // Handle format "HH:MM - HH:MM"
  if (timeStr.includes('-')) {
    const [startTime, endTime] = timeStr.split('-').map(t => t.trim());
    return {
      start: timeToMinutes(startTime),
      end: timeToMinutes(endTime)
    };
  }

  return null;
};

const timeToMinutes = (time) => {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  if (minutes === null) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const colorPalette = [
  'bg-blue-700/50',
  'bg-purple-700/50',
  'bg-green-700/50',
  'bg-red-700/50',
  'bg-yellow-700/50',
  'bg-indigo-700/50',
  'bg-pink-700/50',
  'bg-cyan-700/50',
  'bg-teal-700/50',
  'bg-orange-700/50',
  'bg-lime-700/50',
  'bg-emerald-700/50',
  'bg-sky-700/50',
  'bg-violet-700/50',
  'bg-rose-700/50',
  'bg-amber-700/50',
  'bg-fuchsia-700/50',
  'bg-blue-600/50',
  'bg-purple-600/50',
  'bg-green-600/50'
];

// Check if two time ranges overlap - Move this function up before it's used
const hasTimeOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

const ScheduleViewer = ({ selectedGroups, spacers = [], onRemoveGroup, onEditSpacer, scheduleName = '', isExport = false, isMobile = false, onRevealGroup }) => {
  const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  // Change from starting at hour 5 to starting at hour 7, and reduce length from 18 to 16
  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 7).map(hour =>
    `${hour.toString().padStart(2, '0')}:00`
  );

  const subjectColors = useMemo(() => {
    const uniqueSubjects = [...new Set(selectedGroups.map(group => group.subject))];
    return Object.fromEntries(
      uniqueSubjects.map((subject, index) => [
        subject,
        colorPalette[index % colorPalette.length]
      ])
    );
  }, [selectedGroups]);

  const occupiedSlots = useMemo(() => {
    // Track already processed time slots to avoid duplicates
    const processedSlots = new Map();
    const slots = [];

    selectedGroups.forEach(group => {
      // Handle multiple professor schedules
      group.professor.horarios?.forEach(schedule => {
        const timeRange = parseTimeString(schedule.horario);
        if (!timeRange) return;

        const { start: profStart, end: profEnd } = timeRange;
        const profDays = schedule.dias || [];

        if (profStart !== null && profEnd !== null) {
          profDays.forEach(day => {
            slots.push({
              day,
              start: profStart,
              end: profEnd,
              type: 'professor',
              subject: group.subject,
              group: group.group,
              semester: group.semester,
              majorId: group.majorId, // Add majorId for reveal functionality
              studyPlanId: group.studyPlanId, // Add studyPlanId for reveal functionality
              professor: group.professor.nombre,
              salon: schedule.salon || group.salon || '',
              modalidad: group.modalidad
            });
          });
        }
      });

      // Handle assistants - deduplicate by time slot and day
      if (group.assistants?.length) {
        // Group assistants by time slot and day
        const assistantSlotMap = new Map();

        group.assistants.forEach(assistant => {
          if (!assistant.horario || !assistant.dias || assistant.dias.length === 0) return;

          const timeRange = parseTimeString(assistant.horario);
          if (!timeRange) return;

          const { start: astStart, end: astEnd } = timeRange;

          assistant.dias.forEach(day => {
            if (astStart !== null && astEnd !== null) {
              // Create a unique key for this time slot and day
              const slotKey = `${day}-${astStart}-${astEnd}`;

              // Only add the first assistant for each unique time slot and day
              if (!assistantSlotMap.has(slotKey)) {
                assistantSlotMap.set(slotKey, {
                  day,
                  start: astStart,
                  end: astEnd,
                  type: 'assistant',
                  subject: group.subject,
                  group: group.group,
                  semester: group.semester,
                  majorId: group.majorId, // Add majorId for reveal functionality
                  studyPlanId: group.studyPlanId, // Add studyPlanId for reveal functionality
                  professor: assistant.nombre || 'Ayudante no asignado',
                  salon: assistant.salon || group.salon || '',
                  modalidad: group.modalidad
                });
              }
            }
          });
        });

        // Add the deduplicated assistant slots
        slots.push(...assistantSlotMap.values());
      }
    });

    // Add spacers to slots
    spacers.forEach(spacer => {
      // Handle both old format (single schedule) and new format (multiple schedules)
      const spacerSchedules = spacer.schedules || [{ days: spacer.days, startTime: spacer.startTime, endTime: spacer.endTime, location: spacer.location }];

      spacerSchedules.forEach(schedule => {
        const timeRange = {
          start: timeToMinutes(schedule.startTime),
          end: timeToMinutes(schedule.endTime)
        };

        if (timeRange.start !== null && timeRange.end !== null) {
          schedule.days.forEach(day => {
            // Convert day ID to display format
            const dayMap = {
              'L': 'Lu',
              'M': 'Ma',
              'I': 'Mi',
              'J': 'Ju',
              'V': 'Vi',
              'S': 'Sa'
            };
            const displayDay = dayMap[day];

            slots.push({
              day: displayDay,
              start: timeRange.start,
              end: timeRange.end,
              type: 'spacer',
              spacerId: spacer.id,
              subject: spacer.name,
              group: '',
              salon: schedule.location || '',
              color: spacer.color,
              isSpacer: true
            });
          });
        }
      });
    });

    return slots;
  }, [selectedGroups, spacers]);

  // Group overlapping slots by day
  const groupedSlots = useMemo(() => {
    const slotsByDay = {};

    // Initialize slot groups for each day
    days.forEach(day => {
      slotsByDay[day] = [];
    });

    // Filter slots by day
    occupiedSlots.forEach(slot => {
      slotsByDay[slot.day].push(slot);
    });

    // For each day, find overlapping slots and group them
    const result = {};
    days.forEach(day => {
      const daySlots = slotsByDay[day];
      const overlapGroups = [];

      // Sort slots by start time for easier grouping
      daySlots.sort((a, b) => a.start - b.start);

      // Process each slot
      daySlots.forEach(slot => {
        // Find an existing group that overlaps with this slot
        let foundGroup = false;

        for (const group of overlapGroups) {
          // Check if this slot overlaps with any slot in the group
          const overlapsWithGroup = group.some(existingSlot =>
            hasTimeOverlap(slot.start, slot.end, existingSlot.start, existingSlot.end)
          );

          if (overlapsWithGroup) {
            group.push(slot);
            foundGroup = true;
            break;
          }
        }

        // If no overlapping group found, create a new one
        if (!foundGroup) {
          overlapGroups.push([slot]);
        }
      });

      result[day] = overlapGroups;
    });

    return result;
  }, [occupiedSlots, days]);

  const calculateTop = (minutes) => {
    const startOfDay = 7 * 60; // 7:00 AM in minutes
    const endOfDay = 22 * 60;  // 22:00 PM in minutes (last hour)
    const totalMinutes = endOfDay - startOfDay;
    const relativeMinutes = minutes - startOfDay;
    return (relativeMinutes / totalMinutes) * 100; // Return percentage
  };

  const calculateHeight = (startMinutes, endMinutes) => {
    const startOfDay = 7 * 60; // 7:00 AM in minutes
    const endOfDay = 22 * 60;  // 22:00 PM in minutes (last hour)
    const totalMinutes = endOfDay - startOfDay;
    const durationMinutes = endMinutes - startMinutes;
    return (durationMinutes / totalMinutes) * 100; // Return percentage
  };

  return (
    <div className={`flex flex-col bg-gray-900 ${isMobile ? 'p-1 h-full' : 'p-4 h-full'}`}>
      {/* Only show title in export mode */}
      {scheduleName && isExport && (
        <h1 className="text-2xl font-bold text-gray-100 text-center mb-6">
          {scheduleName}
        </h1>
      )}

      <div className={`flex-1 min-h-0 pb-4 ${isMobile ? 'overflow-auto' : 'overflow-auto'}`}>
        <div className={`h-full min-h-[640px] ${isMobile ? 'min-w-[900px]' : 'min-w-full'}`}>
          <div className="flex h-full min-h-[640px]">
            {/* Time column - fixed width */}
            <div className="sticky left-0 bg-gray-900 z-10 w-16 flex-shrink-0 flex flex-col min-h-[640px]">
              <div className="h-10 border-b border-gray-700 flex-shrink-0"></div>
              {/* Margin to push first hour line down */}
              <div className="h-3 flex-shrink-0"></div>
              <div className="flex-1 relative min-h-[597px]">
                {/* Hours positioned at grid lines */}
                {timeSlots.map((time, index) => (
                  <div
                    key={time}
                    className={`absolute text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'} pr-2 -translate-y-1/2`}
                    style={{
                      top: `${(index / (timeSlots.length - 1)) * 100}%`
                    }}
                  >
                    {time}
                  </div>
                ))}
              </div>
            </div>

            {/* Days container - flex to fill remaining space */}
            <div className="flex-1 grid grid-cols-6 h-full min-h-[640px]">
              {/* Day columns */}
              {days.map(day => (
                <div key={day} className="min-w-0 flex-1 flex flex-col h-full min-h-[640px]">
                  <div className={`h-10 flex-shrink-0 text-gray-100 font-medium flex items-center justify-center bg-gray-900 border-b border-gray-700 border-l border-gray-800 sticky top-0 z-10 ${isMobile ? 'text-sm' : ''}`}>
                    {day}
                  </div>
                  {/* Margin to match time column */}
                  <div className="h-3 flex-shrink-0 border-l border-gray-800"></div>
                  <div className="relative flex-1 min-h-[597px] border-l border-gray-800">
                    {/* Grid lines only between time slots, not at number positions */}
                    {Array.from({ length: timeSlots.length - 1 }).map((_, index) => (
                      <div
                        key={index}
                        className="absolute left-0 right-0 border-t border-gray-800"
                        style={{
                          top: `${((index + 1) / (timeSlots.length - 1)) * 100}%`
                        }}
                      />
                    ))}                    {/* Render grouped slots */}
                    {groupedSlots[day]?.map((group, groupIndex) => {
                      // For single-item groups, render normally
                      if (group.length === 1) {
                        const slot = group[0];
                        const top = calculateTop(slot.start);
                        const height = calculateHeight(slot.start, slot.end);
                        const durationMinutes = slot.end - slot.start;
                        const shouldWrap = durationMinutes >= 120; // 2 hours or more, and NOT overlapping
                        const showSalon = durationMinutes >= 60; // Only show salon if cell is at least 1 hour

                        return (
                          <div
                            key={`single-${groupIndex}`}
                            className={`absolute left-1 right-1 rounded px-2 py-1 ${isMobile ? 'text-xs' : 'text-xs'} ${slot.isSpacer ? slot.color : subjectColors[slot.subject]} time-group-card cursor-pointer hover:opacity-90 transition-opacity`}
                            style={{
                              top: `${top}%`,
                              height: `${height}%`,
                              minHeight: '20px'
                            }}
                            onClick={() => {
                              if (slot.isSpacer && onEditSpacer) {
                                onEditSpacer(slot.spacerId);
                              } else if (onRevealGroup) {
                                onRevealGroup(slot.majorId, slot.studyPlanId, slot.semester, slot.subject, slot.group);
                              }
                            }}
                            title={slot.isSpacer ? "Editar horario personal" : "Ver en selector de materias"}
                          >
                            <div className="flex flex-col h-full overflow-hidden relative">
                              <div className={`font-medium ${isMobile ? 'text-xs' : 'text-xs'} leading-4 text-white truncate ${slot.isSpacer && !isExport ? 'pr-5' : ''}`}>
                                {slot.subject}
                                {slot.isSpacer && !isExport && (
                                  <Edit2 size={12} className="absolute top-0 right-0 text-white/70" />
                                )}
                              </div>
                              {showSalon && slot.salon && (
                                <div className={`text-gray-200 ${shouldWrap ? 'break-words' : 'truncate'} ${isMobile ? 'text-xs' : 'text-xs'} leading-tight`}>
                                  {slot.salon}
                                </div>
                              )}
                              {showSalon && !slot.salon && !slot.isSpacer && (
                                <div className={`text-gray-200 ${shouldWrap ? 'break-words' : 'truncate'} ${isMobile ? 'text-xs' : 'text-xs'} leading-tight`}>
                                  {slot.modalidad || 'Salón no especificado'}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // For multiple overlapping slots, create a container for them but keep individual heights
                      // Get the earliest start time and latest end time for positioning the container
                      const groupStart = Math.min(...group.map(slot => slot.start));
                      const groupEnd = Math.max(...group.map(slot => slot.end));
                      const containerTop = calculateTop(groupStart);
                      const containerHeight = calculateHeight(groupStart, groupEnd);

                      return (
                        <div
                          key={`group-${groupIndex}`}
                          className="absolute left-1 right-1 flex flex-row rounded overflow-hidden"
                          style={{
                            top: `${containerTop}%`,
                            height: `${containerHeight}%`,
                            minHeight: '20px'
                          }}
                        >
                          {group.map((slot, slotIndex) => {
                            // Calculate position relative to the group container
                            const slotTopPercent = ((slot.start - groupStart) / (groupEnd - groupStart)) * 100;
                            const slotHeightPercent = ((slot.end - slot.start) / (groupEnd - groupStart)) * 100;
                            const durationMinutes = slot.end - slot.start;
                            const showSalon = durationMinutes >= 60; // Only show salon if cell is at least 1 hour
                            // When overlapping, ALWAYS truncate, never wrap
                            const shouldWrap = false;

                            return (
                              <div
                                key={`slot-${slotIndex}`}
                                className="relative flex-1 mx-0.5"
                              >
                                <div
                                  className={`absolute ${slot.isSpacer ? slot.color : subjectColors[slot.subject]} px-1 py-1 ${isMobile ? 'text-xs' : 'text-xs'} time-group-card rounded cursor-pointer hover:opacity-90 transition-opacity`}
                                  style={{
                                    top: `${slotTopPercent}%`,
                                    height: `${slotHeightPercent}%`,
                                    width: '100%',
                                    minHeight: '20px'
                                  }}
                                  onClick={() => {
                                    if (slot.isSpacer && onEditSpacer) {
                                      onEditSpacer(slot.spacerId);
                                    } else if (onRevealGroup) {
                                      onRevealGroup(slot.majorId, slot.studyPlanId, slot.semester, slot.subject, slot.group);
                                    }
                                  }}
                                  title={slot.isSpacer ? "Editar horario personal" : "Ver en selector de materias"}
                                >
                                  <div className="flex flex-col h-full overflow-hidden relative">
                                    <div className={`font-medium ${isMobile ? 'text-xs' : 'text-xs'} leading-4 text-white truncate ${slot.isSpacer && !isExport ? 'pr-5' : ''}`}>
                                      {slot.subject}
                                      {slot.isSpacer && !isExport && (
                                        <Edit2 size={12} className="absolute top-0 right-0 text-white/70" />
                                      )}
                                    </div>
                                    {showSalon && slot.salon && (
                                      <div className={`text-gray-200 ${shouldWrap ? 'break-words' : 'truncate'} ${isMobile ? 'text-xs' : 'text-xs'} leading-tight`}>
                                        {slot.salon}
                                      </div>
                                    )}
                                    {showSalon && !slot.salon && !slot.isSpacer && (
                                      <div className={`text-gray-200 ${shouldWrap ? 'break-words' : 'truncate'} ${isMobile ? 'text-xs' : 'text-xs'} leading-tight`}>
                                        {slot.modalidad || 'Salón no especificado'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleViewer;
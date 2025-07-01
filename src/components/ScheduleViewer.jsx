import React, { useMemo } from 'react';

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

const ScheduleViewer = ({ selectedGroups, onRemoveGroup, scheduleName = '', isExport = false }) => {
  const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  const timeSlots = Array.from({ length: 18 }, (_, i) => i + 5).map(hour =>
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
              professor: group.professor.nombre
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
                  professor: assistant.nombre || 'Ayudante no asignado'
                });
              }
            }
          });
        });

        // Add the deduplicated assistant slots
        slots.push(...assistantSlotMap.values());
      }
    });

    return slots;
  }, [selectedGroups]);

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
    const startOfDay = 5 * 60; // 5:00 AM in minutes
    return ((minutes - startOfDay) / 60) * 40; // 40px per hour
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 p-4">
      {scheduleName && (
        <h1 className="text-2xl font-bold text-gray-100 text-center mb-6">
          {scheduleName}
        </h1>
      )}

      <div className="flex-1 overflow-auto min-h-0">
        <div className="relative min-w-full">
          <div className="grid grid-cols-7 gap-1">
            {/* Time column */}
            <div className="sticky left-0 bg-gray-900 z-10">
              <div className="h-10"></div>
              {timeSlots.map((time) => (
                <div key={time} className="h-10 flex items-start relative -top-3 text-gray-400 text-sm">
                  {time}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(day => (
              <div key={day} className="min-w-[130px]">
                <div className="h-10 text-gray-100 font-medium flex items-center justify-center sticky top-0 bg-gray-900 z-10 border-b border-gray-700">
                  {day}
                </div>
                <div className="relative">
                  {timeSlots.map(time => (
                    <div
                      key={time}
                      className="h-10 border-t border-gray-800"
                    ></div>
                  ))}

                  {/* Render grouped slots */}
                  {groupedSlots[day]?.map((group, groupIndex) => {
                    // For single-item groups, render normally
                    if (group.length === 1) {
                      const slot = group[0];
                      const top = calculateTop(slot.start);
                      const height = ((slot.end - slot.start) / 60) * 40;

                      return (
                        <div
                          key={`single-${groupIndex}`}
                          className={`absolute left-0 right-0 mx-1 rounded px-2 py-1 text-xs ${subjectColors[slot.subject]} time-group-card`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            minHeight: '20px'
                          }}
                        >
                          <div className="flex flex-col h-full overflow-hidden">
                            <div className="font-medium text-xs leading-4 text-white truncate">
                              {slot.subject} ({slot.group})
                            </div>
                            <div className="text-gray-200 truncate text-xs leading-tight">
                              {slot.professor}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // For multiple overlapping slots, create a container for them but keep individual heights
                    // Get the earliest start time and latest end time for positioning the container
                    const groupStart = Math.min(...group.map(slot => slot.start));
                    const groupEnd = Math.max(...group.map(slot => slot.end));
                    const containerTop = calculateTop(groupStart);
                    const containerHeight = ((groupEnd - groupStart) / 60) * 40;
                    const width = 100 / group.length; // Each slot gets equal width

                    return (
                      <div
                        key={`group-${groupIndex}`}
                        className="absolute left-0 right-0 mx-1 flex flex-row rounded overflow-hidden"
                        style={{
                          top: `${containerTop}px`,
                          height: `${containerHeight}px`,
                          minHeight: '20px'
                        }}
                      >
                        {group.map((slot, slotIndex) => {
                          // Calculate position relative to the group container
                          const slotTop = calculateTop(slot.start) - containerTop;
                          const slotHeight = ((slot.end - slot.start) / 60) * 40;

                          return (
                            <div
                              key={`slot-${slotIndex}`}
                              className="relative flex-1 mx-0.5"
                            >
                              <div
                                className={`absolute ${subjectColors[slot.subject]} px-1 py-1 text-xs time-group-card rounded`}
                                style={{
                                  top: `${slotTop}px`,
                                  height: `${slotHeight}px`,
                                  width: '100%',
                                  minHeight: '20px'
                                }}
                              >
                                <div className="flex flex-col h-full overflow-hidden">
                                  <div className="font-medium text-xs leading-4 text-white truncate">
                                    {slot.subject} ({slot.group})
                                  </div>
                                  <div className="text-gray-200 truncate text-xs leading-tight">
                                    {slot.professor}
                                  </div>
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
  );
};

export default ScheduleViewer;
import React, { useMemo } from 'react';

const timeToMinutes = (time) => {
  if (!time || time === 'Horario no especificado') return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  if (minutes === null) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Predefined color palette - 20 distinct colors with good contrast
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

const ScheduleViewer = ({ selectedGroups, onRemoveGroup, scheduleName = '', isExport = false }) => {
  const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  const timeSlots = Array.from({ length: 18 }, (_, i) => i + 5).map(hour =>
    `${hour.toString().padStart(2, '0')}:00`
  );

  // Create a map of subjects to colors
  const subjectColors = useMemo(() => {
    const uniqueSubjects = [...new Set(selectedGroups.map(group => group.subject))];
    return Object.fromEntries(
      uniqueSubjects.map((subject, index) => [
        subject,
        colorPalette[index % colorPalette.length]
      ])
    );
  }, [selectedGroups]);

  // Calculate all occupied time slots
  // Calculate all occupied time slots with null checks
  const occupiedSlots = selectedGroups.flatMap(group => {
    const slots = [];

    // Add professor slots
    const profDays = group.professor.dias || [];
    const [profStart, profEnd] = (group.professor.horario || '').split(' - ').map(timeToMinutes);

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

    // Add assistant slots only if they have valid schedule and days
    group.assistants?.forEach(assistant => {
      const [astStart, astEnd] = (assistant.horario || '').split(' - ').map(timeToMinutes);
      const assistantDays = assistant.dias || [];

      // Only add slots if the assistant has both valid time and days
      if (astStart !== null && astEnd !== null && assistantDays.length > 0) {
        assistantDays.forEach(day => {
          slots.push({
            day,
            start: astStart,
            end: astEnd,
            type: 'assistant',
            subject: group.subject,
            group: group.group,
            professor: assistant.nombre
          });
        });
      }
    });

    return slots;
  });

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
                  {occupiedSlots
                    .filter(slot => slot.day === day)
                    .map((slot, index) => {
                      const top = calculateTop(slot.start);
                      const height = ((slot.end - slot.start) / 60) * 40;
                      return (
                        <div
                          key={index}
                          className={`absolute left-0 right-0 mx-1 rounded px-2 py-1 text-xs ${subjectColors[slot.subject]}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`
                          }}
                        >
                          <div className="flex flex-col h-full overflow-hidden">
                            <div className="font-medium text-xs leading-4 text-white truncate">
                              {slot.subject}
                            </div>
                            <div className="text-gray-300 truncate text-xs leading-tight">
                              {slot.professor}
                            </div>
                          </div>
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
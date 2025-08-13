import React, { useState, useMemo } from 'react';
import { createEvents } from 'ics';
import { useMajorContext } from '../contexts/MajorContext';
import { Edit2 } from 'lucide-react';
import ProfessorRating from './ProfessorRating';


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
  TOMATO: 11
};

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

const SelectedGroupsPanel = ({ selectedGroups, onRemoveGroup, onSaveSchedule, setShowSavePopup, scheduleTitle, onTitleChange, isMobile = false }) => {
  const { availableMajors } = useMajorContext();
  const [isNaming, setIsNaming] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(scheduleTitle);


  const subjectColors = useMemo(() => {
    const uniqueSubjects = [...new Set(selectedGroups.map(group => group.subject))];
    return Object.fromEntries(
      uniqueSubjects.map((subject, index) => [
        subject,
        Object.values(GOOGLE_COLORS)[index % Object.keys(GOOGLE_COLORS).length]
      ])
    );
  }, [selectedGroups]);

  const handleSave = () => {
    onSaveSchedule(scheduleTitle);
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
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const handleExportICS = () => {
    const events = [];
    const dayOffsets = { Lu: 0, Ma: 1, Mi: 2, Ju: 3, Vi: 4, Sa: 5 };

    // Get the next Monday as the starting point
    const today = new Date();
    const nextMonday = new Date(today);
    const daysUntilMonday = (7 - today.getDay() + 1) % 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    selectedGroups.forEach((group, groupIndex) => {
      const color = subjectColors[group.subject];

      // Process professor schedules
      group.professor.horarios?.forEach(schedule => {
        const timeRange = parseTimeString(schedule.horario);
        if (timeRange && schedule.dias) {
          schedule.dias.forEach(day => {
            const dayOffset = dayOffsets[day];
            if (dayOffset !== undefined) {
              const eventDate = new Date(nextMonday);
              eventDate.setDate(nextMonday.getDate() + dayOffset);

              const startDateTime = new Date(eventDate);
              const endDateTime = new Date(eventDate);

              startDateTime.setHours(Math.floor(timeRange.start / 60), timeRange.start % 60);
              endDateTime.setHours(Math.floor(timeRange.end / 60), timeRange.end % 60);

              events.push({
                title: `${group.subject} (${group.group})`,
                description: `Profesor: ${group.professor.nombre}\nAyudantes: ${group.assistants?.map(a => a.nombre).join(', ') || 'N/A'}`,
                start: [startDateTime.getFullYear(), startDateTime.getMonth() + 1, startDateTime.getDate(), startDateTime.getHours(), startDateTime.getMinutes()],
                end: [endDateTime.getFullYear(), endDateTime.getMonth() + 1, endDateTime.getDate(), endDateTime.getHours(), endDateTime.getMinutes()],
                location: group.salon || group.modalidad || '',
                categories: [group.subject],
                status: 'CONFIRMED',
                busyStatus: 'BUSY',
                organizer: { name: group.professor.nombre || 'Profesor' },
                recurrenceRule: 'FREQ=WEEKLY;COUNT=16',
                color: color
              });
            }
          });
        }
      });

      // Process assistants schedules
      group.assistants?.forEach(assistant => {
        const timeRange = parseTimeString(assistant.horario);
        if (timeRange && assistant.dias) {
          assistant.dias.forEach(day => {
            const dayOffset = dayOffsets[day];
            if (dayOffset !== undefined) {
              const eventDate = new Date(nextMonday);
              eventDate.setDate(nextMonday.getDate() + dayOffset);

              const startDateTime = new Date(eventDate);
              const endDateTime = new Date(eventDate);

              startDateTime.setHours(Math.floor(timeRange.start / 60), timeRange.start % 60);
              endDateTime.setHours(Math.floor(timeRange.end / 60), timeRange.end % 60);

              events.push({
                title: `${group.subject} (${group.group}) - Ayudantía`,
                description: `Ayudante: ${assistant.nombre}`,
                start: [startDateTime.getFullYear(), startDateTime.getMonth() + 1, startDateTime.getDate(), startDateTime.getHours(), startDateTime.getMinutes()],
                end: [endDateTime.getFullYear(), endDateTime.getMonth() + 1, endDateTime.getDate(), endDateTime.getHours(), endDateTime.getMinutes()],
                location: assistant.salon || '',
                categories: [group.subject],
                status: 'CONFIRMED',
                busyStatus: 'BUSY',
                organizer: { name: assistant.nombre || 'Ayudante' },
                recurrenceRule: 'FREQ=WEEKLY;COUNT=16',
                color: color
              });
            }
          });
        }
      });
    });

    createEvents(events, (error, value) => {
      if (error) {
        console.error('Error creating ICS file:', error);
        return;
      }

      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `${scheduleTitle || 'horario'}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  };

  if (isMobile) {
    // Mobile horizontal layout
    return (
      <div className="flex items-center space-x-3 overflow-x-auto">
        {/* Schedule Title */}
        <div className="flex-shrink-0 flex items-center">
          {isEditingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyPress}
              className="bg-gray-800 text-white px-2 py-1 rounded text-sm w-32 border border-gray-600 focus:border-blue-500 outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center">
              <span className="text-white font-medium text-sm truncate max-w-32">
                {scheduleTitle}
              </span>
              <button
                onClick={handleTitleEdit}
                className="ml-1 text-gray-400 hover:text-white p-1"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Selected Groups Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto flex-1">
          {selectedGroups.map((group, index) => (
            <div
              key={`${group.semester}-${group.subject}-${group.group}`}
              className="flex-shrink-0 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1 flex items-center space-x-2"
            >
              <div className="text-xs">
                <span className="text-white font-medium">{group.subject}</span>
                <span className="text-gray-400 ml-1">({group.group})</span>
              </div>
              <button
                onClick={() => onRemoveGroup(group.semester, group.subject, group.group, {
                  profesor: group.professor,
                  ayudantes: group.assistants
                })}
                className="text-red-400 hover:text-red-300 text-xs h-4 w-4 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center space-x-2">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
          >
            Guardar
          </button>
          <button
            onClick={handleExportICS}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
          >
            .ics
          </button>
        </div>
      </div>
    );
  }

  // Desktop vertical layout (existing code)
  return (
    const semesterStart = new Date(2025, 7, 11);
    const dayMap = { Lu: 'MO', Ma: 'TU', Mi: 'WE', Ju: 'TH', Vi: 'FR', Sa: 'SA' };

    selectedGroups.forEach(group => {
      // Process professor schedules
      group.professor.horarios?.forEach(schedule => {
        if (!schedule.horario || !schedule.dias || schedule.dias.length === 0) return;

        const timeRange = parseTimeString(schedule.horario);
        if (!timeRange) return;

        const { start, end } = timeRange;
        const startHour = Math.floor(start / 60);
        const startMinute = start % 60;
        const endHour = Math.floor(end / 60);
        const endMinute = end % 60;

        schedule.dias.forEach(day => {
          const firstClass = new Date(semesterStart);
          firstClass.setDate(semesterStart.getDate() + dayOffsets[day]);

          events.push({
            start: [
              firstClass.getFullYear(),
              firstClass.getMonth() + 1,
              firstClass.getDate(),
              startHour,
              startMinute
            ],
            end: [
              firstClass.getFullYear(),
              firstClass.getMonth() + 1,
              firstClass.getDate(),
              endHour,
              endMinute
            ],
            startInputType: 'local',
            endInputType: 'local',
            title: `${group.subject}`,
            description: `Profesor: ${group.professor.nombre}`,
            location: group.salon || '',
            recurrenceRule: `FREQ=WEEKLY;BYDAY=${dayMap[day]};UNTIL=20251128T235959Z`
          });
        });
      });

      // Process assistants with deduplication
      if (group.assistants?.length) {
        // Use a map to track unique time-day combinations
        const assistantSlotMap = new Map();

        group.assistants.forEach(assistant => {
          if (!assistant.horario || !assistant.dias || assistant.dias.length === 0) return;

          const timeRange = parseTimeString(assistant.horario);
          if (!timeRange) return;

          const { start, end } = timeRange;

          assistant.dias.forEach(day => {
            // Create a unique key for this time slot and day
            const slotKey = `${day}-${start}-${end}`;

            // Only add the first assistant for each unique time slot and day
            if (!assistantSlotMap.has(slotKey)) {
              assistantSlotMap.set(slotKey, {
                day,
                start,
                end,
                name: assistant.nombre || 'Ayudante no asignado',
                salon: assistant.salon || group.salon || ''
              });
            }
          });
        });

        // Process the deduplicated slots
        for (const [_, slot] of assistantSlotMap) {
          const startHour = Math.floor(slot.start / 60);
          const startMinute = slot.start % 60;
          const endHour = Math.floor(slot.end / 60);
          const endMinute = slot.end % 60;

          const firstClass = new Date(semesterStart);
          firstClass.setDate(semesterStart.getDate() + dayOffsets[slot.day]);

          events.push({
            start: [
              firstClass.getFullYear(),
              firstClass.getMonth() + 1,
              firstClass.getDate(),
              startHour,
              startMinute
            ],
            end: [
              firstClass.getFullYear(),
              firstClass.getMonth() + 1,
              firstClass.getDate(),
              endHour,
              endMinute
            ],
            startInputType: 'local',
            endInputType: 'local',
            title: `${group.subject}`,
            description: `Ayudante: ${slot.name}`,
            location: slot.salon,
            recurrenceRule: `FREQ=WEEKLY;BYDAY=${dayMap[slot.day]};UNTIL=20251128T235959Z`
          });
        }
      }
    });

    createEvents(events, {
      productId: 'creador-horarios/ics',
      calName: 'Horario UNAM'
    }, (error, value) => {
      if (error) {
        console.error('ICS Error:', error);
        alert('Error al generar el archivo ICS. Por favor, intenta de nuevo.');
        return;
      }

      // Add timezone information to the ICS content manually
      let icsContent = value;
      if (icsContent && !icsContent.includes('VTIMEZONE')) {
        // Insert timezone info after the calendar header
        const lines = icsContent.split('\n');
        const beginCalendarIndex = lines.findIndex(line => line.startsWith('BEGIN:VCALENDAR'));
        if (beginCalendarIndex !== -1) {
          const timezoneData = [
            'BEGIN:VTIMEZONE',
            'TZID:America/Mexico_City',
            'BEGIN:STANDARD',
            'DTSTART:20071104T020000',
            'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
            'TZNAME:CST',
            'TZOFFSETFROM:-0500',
            'TZOFFSETTO:-0600',
            'END:STANDARD',
            'BEGIN:DAYLIGHT',
            'DTSTART:20070401T020000',
            'RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU',
            'TZNAME:CDT',
            'TZOFFSETFROM:-0600',
            'TZOFFSETTO:-0500',
            'END:DAYLIGHT',
            'END:VTIMEZONE'
          ];
          lines.splice(beginCalendarIndex + 3, 0, ...timezoneData);
          icsContent = lines.join('\n');
        }
      }

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `${scheduleTitle.replace(/[^a-z0-9]/gi, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      setShowSavePopup(true);
    });
  };



  return (
    <div className={`transition-all duration-300 bg-gray-900 flex flex-col relative h-full ${isMobile
      ? 'border-t border-gray-700'
      : 'border-l border-gray-700'
      }`}>



      {/* Schedule Title Section */}
      <div className="p-4 border-b border-gray-700">
        {isEditingTitle ? (
          <div className="space-y-2">
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={handleTitleKeyPress}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-gray-100 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              autoComplete="off"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleTitleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-xs"
              >
                Guardar
              </button>
              <button
                onClick={handleTitleCancel}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-between cursor-pointer group hover:bg-gray-800 rounded p-2 -m-2"
            onClick={handleTitleEdit}
          >
            <div className="text-gray-100 font-medium text-lg group-hover:text-blue-400 transition-colors">
              {scheduleTitle}
            </div>
            <Edit2
              size={14}
              className="text-gray-400 group-hover:text-blue-400 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Action Buttons Section */}
      <div className="p-4 space-y-2 border-b border-gray-700">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          disabled={selectedGroups.length === 0}
        >
          Guardar PNG
        </button>
        <button
          onClick={handleExportICS}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
          disabled={selectedGroups.length === 0}
        >
          Exportar ICS
        </button>
      </div>

      <h3 className="text-lg font-medium text-gray-100 mb-2 px-4">Materias Seleccionadas:</h3>
      <div className="space-y-3 overflow-y-auto flex-1 px-4">
        {selectedGroups.map((group, index) => {
          return (
            <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              {/* Header section with subject, group, and professor */}
              <div className="p-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-100">{group.subject}</h4>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-400">Grupo {group.group}</span>
                      {group.professor.nombre && (
                        <span className="text-gray-400">• {group.professor.nombre}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveGroup(group.semester, group.subject, group.group, {
                      profesor: group.professor,
                      ayudantes: group.assistants
                    })}
                    className="text-red-400 hover:text-red-300 text-xs h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-700 ml-2"
                    aria-label="Eliminar materia"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Classroom/Modality/Rating section */}
              {(group.salon || group.modalidad || group.professor.nombre) && (
                <div className="px-3 py-2 text-xs flex items-center justify-between text-gray-300">
                  <div className="flex items-center">
                    {group.salon ? (
                      // If classroom is available, show only the classroom
                      <>
                        <span className="mr-1">🏫</span>
                        <span>{group.salon}</span>
                      </>
                    ) : group.modalidad ? (
                      // If no classroom but modality exists, show modality
                      <>
                        <span className="mr-1">{group.modalidad === "Presencial" ? "👨‍🏫" : "💻"}</span>
                        <span>{group.modalidad}</span>
                      </>
                    ) : null}
                  </div>
                  {group.professor.nombre && (
                    <ProfessorRating
                      professorName={group.professor.nombre}
                      className="text-xs"
                    />
                  )}
                </div>
              )}

              {/* Presentation button section */}
              {group.presentacion && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => window.open(group.presentacion, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    <span className="mr-1">📄</span>
                    Presentación
                  </button>
                </div>
              )}
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
        Con ♥️ por Dvd22 - {' '}
        <a
          href="https://github.com/dvd-22/creador-horarios"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300"
        >
          Contribuye
        </a>
      </div>
    </div>
  );
};

export default SelectedGroupsPanel;
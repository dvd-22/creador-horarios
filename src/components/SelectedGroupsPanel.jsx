import React, { useState, useMemo } from 'react';
import { createEvents } from 'ics';
import { useMajorContext } from '../contexts/MajorContext';
import { ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
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


const getMajorColorClass = (majorId) => {
  switch (majorId) {
    case 'cs':
      return 'bg-gray-600';
    case 'math':
      return 'bg-purple-500';
    case 'physics':
      return 'bg-yellow-500';
    case 'ap-math':
      return 'bg-orange-500';
    case 'actuary':
      return 'bg-blue-500';
    case 'biology':
      return 'bg-green-700';
    default:
      return 'bg-gray-600';
  }
};

const SelectedGroupsPanel = ({ selectedGroups, onRemoveGroup, onSaveSchedule, setShowSavePopup, scheduleTitle, onTitleChange }) => {
  const { availableMajors } = useMajorContext();
  const [isNaming, setIsNaming] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(scheduleTitle);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
                name: assistant.nombre || 'Ayudante no asignado'
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
            location: group.salon || '',
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

  // Toggle panel collapse state
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`transition-all duration-300 bg-gray-900 border-l border-gray-700 flex flex-col relative ${isCollapsed ? 'w-12' : 'w-64'}`}>

      <button
        onClick={toggleCollapse}
        className="absolute -left-4 top-4 bg-gray-800 text-gray-400 hover:text-gray-100 p-1 rounded-l-md border border-gray-700 border-r-0 z-10"
        aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
      >
        {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center py-4 space-y-4">
          <div
            className="text-gray-400 text-xs"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)'
            }}
          >
            Materias
          </div>
          <div className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-xs text-white font-medium">
            {selectedGroups.length}
          </div>
        </div>
      ) : (
        <>
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
          <div className="space-y-2 overflow-y-auto flex-1 px-4">
            {selectedGroups.map((group, index) => {
              // Get major color using the fixed function
              const majorId = group.majorId || 'cs';
              const majorColorClass = getMajorColorClass(majorId);

              return (
                <div key={index} className="flex flex-col bg-gray-800 rounded">
                  {/* Add major indicator */}
                  <div className={`h-1 w-full ${majorColorClass} rounded-t`}></div>

                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <span className="text-gray-100">{group.subject}</span>
                        <span className="text-gray-400 ml-2">Grupo {group.group}</span>
                        {group.professor.nombre && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-400 text-sm">• {group.professor.nombre}</span>
                            <ProfessorRating
                              professorName={group.professor.nombre}
                              className="text-xs"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onRemoveGroup(group.semester, group.subject, group.group, {
                          profesor: group.professor,
                          ayudantes: group.assistants
                        })}
                        className="text-red-400 hover:text-red-300 text-xs h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-700"
                        aria-label="Eliminar materia"
                      >
                        ✕
                      </button>
                    </div>

                    {group.presentacion && (
                      <div className="mt-2">
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
        </>
      )}
    </div>
  );
};

export default SelectedGroupsPanel;
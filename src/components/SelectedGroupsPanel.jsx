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

const SelectedGroupsPanel = ({
  selectedGroups,
  onRemoveGroup,
  onSaveSchedule,
  setShowSavePopup,
  scheduleTitle,
  onTitleChange,
  isMobile = false,
  showOnlyHeader = false,
  showOnlySubjects = false,
  horizontal = false,
  showSubjectsCount = false
}) => {
  const { availableMajors } = useMajorContext();
  const [isNaming, setIsNaming] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(scheduleTitle);

  // Color palette that matches ScheduleViewer
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

  // Convert Tailwind color classes to CSS colors for color bars
  const getColorFromClass = (colorClass) => {
    const colorMap = {
      'bg-blue-700/50': '#1d4ed8',
      'bg-purple-700/50': '#7c3aed',
      'bg-green-700/50': '#15803d',
      'bg-red-700/50': '#b91c1c',
      'bg-yellow-700/50': '#a16207',
      'bg-indigo-700/50': '#4338ca',
      'bg-pink-700/50': '#be185d',
      'bg-cyan-700/50': '#0e7490',
      'bg-teal-700/50': '#0f766e',
      'bg-orange-700/50': '#c2410c',
      'bg-lime-700/50': '#4d7c0f',
      'bg-emerald-700/50': '#047857',
      'bg-sky-700/50': '#0369a1',
      'bg-violet-700/50': '#6d28d9',
      'bg-rose-700/50': '#be123c',
      'bg-amber-700/50': '#b45309',
      'bg-fuchsia-700/50': '#a21caf',
      'bg-blue-600/50': '#2563eb',
      'bg-purple-600/50': '#9333ea',
      'bg-green-600/50': '#16a34a'
    };
    return colorMap[colorClass] || '#6b7280';
  };

  const subjectColors = useMemo(() => {
    const uniqueSubjects = [...new Set(selectedGroups.map(group => group.subject))];
    return Object.fromEntries(
      uniqueSubjects.map((subject, index) => [
        subject,
        colorPalette[index % colorPalette.length]
      ])
    );
  }, [selectedGroups, colorPalette]);

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
    // Mobile header only (title and buttons)
    if (showOnlyHeader) {
      return (
        <div className="flex items-center justify-between">
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
              <div className="flex items-center flex-1 min-w-0">
                <span className="text-white font-medium text-sm truncate">
                  {scheduleTitle}
                </span>
                <button
                  onClick={handleTitleEdit}
                  className="ml-2 text-gray-400 hover:text-white p-1 flex-shrink-0"
                >
                  <Edit2 size={12} />
                </button>
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
      );
    }

    // Mobile subjects only (horizontal chips)
    if (showOnlySubjects && horizontal) {
      return (
        <div className="flex flex-wrap gap-2">
          {selectedGroups.map((group, index) => {
            const colorClass = subjectColors[group.subject];
            const colorHex = getColorFromClass(colorClass);

            return (
              <div
                key={`${group.semester}-${group.subject}-${group.group}`}
                className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden flex items-center"
              >
                {/* Color Bar */}
                <div
                  className="w-1 h-full flex-shrink-0"
                  style={{ backgroundColor: colorHex }}
                />

                {/* Content */}
                <div className="px-2 py-1 flex items-center space-x-2">
                  <div className="text-xs">
                    <span className="text-white font-medium">{group.subject}</span>
                    <span className="text-gray-400 ml-1">({group.group})</span>
                  </div>

                  <button
                    onClick={() => onRemoveGroup(group.semester, group.subject, group.group, {
                      profesor: group.professor,
                      ayudantes: group.assistants
                    })}
                    className="text-red-400 hover:text-red-300 text-xs h-4 w-4 flex items-center justify-center flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {selectedGroups.length === 0 && (
            <div className="text-gray-500 text-sm italic">
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
                <div className="flex items-center flex-1 min-w-0">
                  <span className="text-white font-medium text-sm truncate">
                    {scheduleTitle}
                  </span>
                  <button
                    onClick={handleTitleEdit}
                    className="ml-2 text-gray-400 hover:text-white p-1 flex-shrink-0"
                  >
                    <Edit2 size={12} />
                  </button>
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
                        <span className="text-white font-medium">{group.subject}</span>
                        <span className="text-gray-400 ml-1">({group.group})</span>
                      </div>
                      {group.professor.nombre && (
                        <div className="text-xs text-gray-400 truncate mt-1">
                          {group.professor.nombre}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onRemoveGroup(group.semester, group.subject, group.group, {
                        profesor: group.professor,
                        ayudantes: group.assistants
                      })}
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
      </div>
    );
  }  // Desktop vertical layout (existing code)
  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center flex-1">
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
              <div className="flex items-center flex-1">
                <h2 className="text-lg font-semibold text-white truncate">
                  {scheduleTitle}
                </h2>
                <button
                  onClick={handleTitleEdit}
                  className="ml-2 text-gray-400 hover:text-white p-1 rounded"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
          >
            💾 Guardar como PNG
          </button>
          <button
            onClick={handleExportICS}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
          >
            📅 Exportar .ics
          </button>
        </div>
      </div>

      {/* Selected Groups List */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="font-medium text-gray-300 mb-3">
          Materias seleccionadas ({selectedGroups.length})
        </h3>
        {selectedGroups.map((group, index) => {
          const majorInfo = Object.values(availableMajors).find(m => m.id === group.semester);

          return (
            <div key={`${group.semester}-${group.subject}-${group.group}`} className="mb-3 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
              {/* Header with subject name and remove button */}
              <div className="bg-gray-800 px-3 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm mb-1 break-words">
                      {group.subject}
                    </div>
                    <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
                      <span className="bg-gray-700 px-2 py-1 rounded">Grupo {group.group}</span>
                      {majorInfo && (
                        <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                          {majorInfo.name}
                        </span>
                      )}
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

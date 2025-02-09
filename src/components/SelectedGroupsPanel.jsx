import React, { useState, useMemo } from 'react';
import { createEvents } from 'ics';

// Add Google Calendar color codes
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

const SelectedGroupsPanel = ({ selectedGroups, onRemoveGroup, onSaveSchedule, setShowSavePopup }) => {
  const [isNaming, setIsNaming] = useState(false);
  const [scheduleName, setScheduleName] = useState('');

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
    setIsNaming(true);
  };

  const handleSaveConfirm = () => {
    if (scheduleName.trim()) {
      onSaveSchedule(scheduleName);
      setIsNaming(false);
      setScheduleName('');
    }
  };

  const handleExportICS = () => {
    const events = [];
    const dayOffsets = { Lu: 0, Ma: 1, Mi: 2, Ju: 3, Vi: 4, Sa: 5 };
    const semesterStart = new Date(2025, 0, 27);

    selectedGroups.forEach(group => {
      group.professor.horarios?.forEach(schedule => {
        const [startTime, endTime] = schedule.horario.split(' - ');
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        schedule.dias.forEach(day => {
          const dayMap = { Lu: 'MO', Ma: 'TU', Mi: 'WE', Ju: 'TH', Vi: 'FR', Sa: 'SA' };
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
            title: `${group.subject}`,
            description: `Profesor: ${group.professor.nombre}`,
            location: `Profesor`,
            recurrenceRule: `FREQ=WEEKLY;BYDAY=${dayMap[day]};UNTIL=20250523T235959Z`
          });
        });
      });

      group.assistants?.forEach(assistant => {
        if (assistant.horario !== "Horario no especificado" && assistant.dias) {
          const [startTime, endTime] = assistant.horario.split(' - ');
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);

          assistant.dias.forEach(day => {
            const dayMap = { Lu: 'MO', Ma: 'TU', Mi: 'WE', Ju: 'TH', Vi: 'FR', Sa: 'SA' };
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
              title: `${group.subject}`,
              description: `Ayudante: ${assistant.nombre}`,
              location: `Ayudantía`,
              recurrenceRule: `FREQ=WEEKLY;BYDAY=${dayMap[day]};UNTIL=20250523T235959Z`
            });
          });
        }
      });
    });

    createEvents(events, (error, value) => {
      if (error) {
        console.error(error);
        return;
      }
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'horario.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowSavePopup(true);
    });
  };

  return (
    <div className="w-64 border-l border-gray-700 bg-gray-900 p-4 flex flex-col">
      <div className="mb-4 space-y-2">
        {isNaming ? (
          <div className="space-y-2">
            <input
              type="text"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="Nombre del horario"
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSaveConfirm}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                Guardar PNG
              </button>
              <button
                onClick={() => setIsNaming(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleSave}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              disabled={selectedGroups.length === 0}
            >
              Guardar PNG
            </button>
            <button
              onClick={handleExportICS}
              className="group relative w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              disabled={selectedGroups.length === 0}
            >
              Exportar ICS
              <span className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Exporta a Google Calendar
              </span>
            </button>
          </div>
        )}
      </div>

      <h3 className="text-lg font-medium text-gray-100 mb-2">Materias Seleccionadas:</h3>
      <div className="space-y-2 overflow-y-auto flex-1">
        {selectedGroups.map((group, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded">
            <div>
              <span className="text-gray-100">{group.subject}</span>
              <span className="text-gray-400 ml-2">Grupo {group.group}</span>
            </div>
            <button
              onClick={() => onRemoveGroup(group.semester, group.subject, group.group, {
                profesor: group.professor,
                ayudantes: group.assistants
              })}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center text-sm text-gray-400">
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
import React from 'react';

// Utility functions
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const ScheduleDisplay = ({ selectedGroups, onRemoveGroup }) => {
  const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi','Sa'];
  const timeSlots = Array.from({ length: 24 }, (_, i) => i).map(hour => 
    `${hour.toString().padStart(2, '0')}:00`
  );

  // Calculate all occupied time slots
  const occupiedSlots = selectedGroups.flatMap(group => {
    const slots = [];
    
    // Add professor slots
    const profDays = group.professor.dias;
    const [profStart, profEnd] = group.professor.horario.split(' - ').map(timeToMinutes);
    
    profDays.forEach(day => {
      slots.push({
        day,
        start: profStart,
        end: profEnd,
        type: 'professor',
        subject: group.subject,
        group: group.group
      });
    });

    // Add assistant slots
    group.assistants.forEach(assistant => {
      const [astStart, astEnd] = assistant.horario.split(' - ').map(timeToMinutes);
      assistant.dias.forEach(day => {
        slots.push({
          day,
          start: astStart,
          end: astEnd,
          type: 'assistant',
          subject: group.subject,
          group: group.group
        });
      });
    });

    return slots;
  });

  return (
    <div className="h-screen overflow-y-auto p-4 bg-gray-900">
      <h2 className="text-xl font-bold text-gray-100 mb-4">Horario</h2>
      <div className="grid grid-cols-7 gap-1">
        {/* Time column */}
        <div className="sticky left-10 bg-gray-900">
          <div className="h-10"></div> {/* Header spacing */}
          {timeSlots.map(time => (
            <div key={time} className="h-10 text-gray-400 text-sm flex items-center">
              {time}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(day => (
          <div key={day} className="min-w-[120px]">
            <div className="h-10 text-gray-100 font-medium flex items-center justify-center">
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
                  const top = (slot.start / 60) * 40; // 40px per hour
                  const height = ((slot.end - slot.start) / 60) * 40;
                  return (
                    <div
                      key={index}
                      className={`absolute left-0 right-0 mx-1 rounded px-1 text-xs overflow-hidden
                        ${slot.type === 'professor' ? 'bg-blue-900/50' : 'bg-purple-900/50'}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`
                      }}
                    >
                      <div className="truncate">
                        {slot.subject} ({slot.group})
                      </div>
                      <div className="truncate text-gray-300">
                        {minutesToTime(slot.start)} - {minutesToTime(slot.end)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {selectedGroups.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-medium text-gray-100">Materias Seleccionadas:</h3>
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
      )}
    </div>
  );
};

export default ScheduleDisplay;
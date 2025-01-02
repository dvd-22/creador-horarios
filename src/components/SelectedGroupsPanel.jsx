import React, { useState } from 'react';

const SelectedGroupsPanel = ({ selectedGroups, onRemoveGroup, onSaveSchedule }) => {
  const [isNaming, setIsNaming] = useState(false);
  const [scheduleName, setScheduleName] = useState('');

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

  return (
    <div className="w-64 border-l border-gray-700 bg-gray-900 p-4 flex flex-col">
      <div className="mb-4">
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
                Guardar
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
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            disabled={selectedGroups.length === 0}
          >
            Guardar Horario
          </button>
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
    </div>
  );
};

export default SelectedGroupsPanel;
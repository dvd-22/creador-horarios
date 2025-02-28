import React, { forwardRef } from 'react';

const ExportLayout = forwardRef(({ selectedGroups, schedule }, ref) => {
    return (
        <div
            ref={ref}
            className="bg-gray-900 p-4"
            style={{
                position: 'absolute',
                display: 'none',
                minWidth: '1400px',
                minHeight: '800px'
            }}
        >
            <div className="flex gap-4">
                <div className="flex-1">
                    {React.cloneElement(schedule, { isExport: true })}
                </div>
                <div className="w-64 bg-gray-900 p-4">
                    <h3 className="text-lg font-medium text-gray-100 mb-2">Materias Seleccionadas:</h3>
                    <div className="space-y-3">
                        {selectedGroups.map((group, index) => (
                            <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                                <div className="p-3 bg-gray-750 border-b border-gray-700">
                                    <div>
                                        <h4 className="font-medium text-gray-100">{group.subject}</h4>
                                        <div className="flex items-center space-x-2 text-sm">
                                            <span className="text-gray-400">Grupo {group.group}</span>
                                            {group.professor.nombre && (
                                                <span className="text-gray-400">• {group.professor.nombre}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {group.salon && (
                                    <div className="px-3 py-2 text-xs flex items-center text-gray-300">
                                        <span className="mr-1">🏫</span>
                                        <span>{group.salon}</span>
                                        {group.modalidad && (
                                            <span className="ml-2">
                                                <span className="mr-1">{group.modalidad === "Presencial" ? "👨‍🏫" : "💻"}</span>
                                                {group.modalidad}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-400">
                        Con ♥️ por Dvd22 - {' '}
                        <a
                            href="https://github.com/dvd-22/creador-horarios"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400"
                        >
                            Contribuye
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
});

ExportLayout.displayName = 'ExportLayout';

export default ExportLayout;
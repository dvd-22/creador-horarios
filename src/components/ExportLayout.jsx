import React, { forwardRef } from 'react';
import ProfessorRating from './ProfessorRating';

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
                    <div className="space-y-2">
                        {selectedGroups.map((group, index) => (
                            <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                                <div className="p-2 bg-gray-800 border-b border-gray-700">
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
                                {(group.salon || group.modalidad || group.professor.nombre) && (
                                    <div className="px-2 py-1 text-xs flex items-center justify-between text-gray-300">
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
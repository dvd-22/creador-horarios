import React, { forwardRef, useMemo } from 'react';
import ProfessorRating from './ProfessorRating';

const ExportLayout = forwardRef(({ selectedGroups, schedule }, ref) => {
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
    }, [selectedGroups]);

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
                        {selectedGroups.map((group, index) => {
                            const colorClass = subjectColors[group.subject];
                            const colorHex = getColorFromClass(colorClass);

                            return (
                                <div key={index} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex">
                                    {/* Color Bar */}
                                    <div
                                        className="w-1 flex-shrink-0"
                                        style={{ backgroundColor: colorHex }}
                                    />

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="p-2 bg-gray-800 border-b border-gray-700">
                                            <div>
                                                {/* Subject Title */}
                                                <h4 className="font-medium text-gray-100">{group.subject}</h4>
                                                {/* Professor */}
                                                {group.professor.nombre && (
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {group.professor.nombre}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Separating line and bottom section */}
                                        <div className="px-2 py-1 text-xs flex items-center justify-between text-gray-300">
                                            {/* Group info */}
                                            <div className="flex items-center">
                                                <span className="bg-gray-700 px-2 py-1 rounded">
                                                    Grupo {group.group}
                                                </span>
                                            </div>

                                            {/* Rating on the right */}
                                            {group.professor.nombre && (
                                                <ProfessorRating
                                                    professorName={group.professor.nombre}
                                                    className="text-xs"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
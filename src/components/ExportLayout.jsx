import React from 'react';

const ExportLayout = React.forwardRef(({ selectedGroups, schedule }, ref) => {
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
                            <div key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                                <div>
                                    <span className="text-gray-100">{group.subject}</span>
                                    <span className="text-gray-400 ml-2">Grupo {group.group}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ExportLayout;
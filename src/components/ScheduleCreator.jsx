import React, { useState } from 'react';
import ScheduleViewer from './ScheduleViewer';
import ScheduleDisplay from './ScheduleDisplay';

const ScheduleCreator = () => {
    const [selectedGroups, setSelectedGroups] = useState([]);

    const handleGroupSelect = (semester, subject, group, groupData) => {
        setSelectedGroups(prev => {
            const isSelected = prev.some(g =>
                g.semester === semester &&
                g.subject === subject &&
                g.group === group
            );

            if (isSelected) {
                return prev.filter(g =>
                    !(g.semester === semester &&
                        g.subject === subject &&
                        g.group === group)
                );
            }

            return [...prev, {
                semester,
                subject,
                group,
                professor: groupData.profesor,
                assistants: groupData.ayudantes
            }];
        });
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <div className="w-80 flex-shrink-0">
                <ScheduleViewer
                    onGroupSelect={handleGroupSelect}
                    selectedGroups={selectedGroups}
                />
            </div>
            <div className="flex-1">
                <ScheduleDisplay
                    selectedGroups={selectedGroups}
                    onRemoveGroup={handleGroupSelect}
                />
            </div>
        </div>
    );
};

export default ScheduleCreator;
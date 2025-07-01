import React from 'react';
import { useMajorContext } from '../contexts/MajorContext';
import { CheckCircle2 } from 'lucide-react';

// Function to get the correct color classes based on major ID and whether it's selected
const getMajorColorClasses = (majorId, isSelected) => {
    // Base style for all buttons
    let baseClasses = "flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ";

    if (!isSelected) {
        return baseClasses + "bg-gray-800 text-gray-300 hover:bg-gray-700";
    }

    // Add color classes based on major ID when selected
    switch (majorId) {
        case 'cs':
            return baseClasses + "bg-blue-500 text-white";
        case 'math':
            return baseClasses + "bg-purple-500 text-white";
        case 'physics':
            return baseClasses + "bg-green-500 text-white";
        case 'ap-math':
            return baseClasses + "bg-orange-500 text-white";
        case 'biology':
            return baseClasses + "bg-green-700 text-white";
        default:
            return baseClasses + "bg-gray-600 text-white";
    }
};

const MajorSelector = () => {
    const { selectedMajorId, availableMajors, changeMajor } = useMajorContext();

    return (
        <div className="border-b border-gray-700 bg-gray-850 p-2">
            <div className="flex space-x-1 overflow-x-auto no-scrollbar py-1">
                {Object.values(availableMajors).map((major) => (
                    <button
                        key={major.id}
                        onClick={() => changeMajor(major.id)}
                        className={getMajorColorClasses(major.id, selectedMajorId === major.id)}
                    >
                        {selectedMajorId === major.id && (
                            <CheckCircle2 size={14} className="mr-1" />
                        )}
                        {major.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MajorSelector;

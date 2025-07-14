import React from 'react';
import { useMajorContext } from '../contexts/MajorContext';
import { CheckCircle2 } from 'lucide-react';

// Function to get the correct color classes based on the major's ID
const getMajorColorClasses = (majorId, isSelected) => {
    let baseClasses = "flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ";

    if (!isSelected) {
        return baseClasses + "bg-gray-800 text-gray-300 hover:bg-gray-700";
    }

    switch (majorId) {
        case 'cs':
            return baseClasses + "bg-gray-600 text-white";
        case 'math':
            return baseClasses + "bg-purple-500 text-white";
        case 'physics':
            return baseClasses + "bg-yellow-500 text-white";
        case 'ap-math':
            return baseClasses + "bg-orange-500 text-white";
        case 'actuary':
            return baseClasses + "bg-blue-500 text-white";
        case 'biology':
            return baseClasses + "bg-green-700 text-white";
        default:
            return baseClasses + "bg-gray-600 text-white";
    }
};

const MajorSelector = () => {
    const { selectedMajorId, selectedStudyPlan, availableMajors, changeMajor, changeStudyPlan, isLoading } = useMajorContext();

    const currentMajor = availableMajors[selectedMajorId];
    const hasStudyPlans = currentMajor?.hasStudyPlans;

    return (
        <div className="border-b border-gray-700 bg-gray-850">
            {/* Major Selector */}
            <div className="p-2 relative">
                <div className="flex space-x-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 py-1">
                    {Object.values(availableMajors).map((major) => (
                        <button
                            key={major.id}
                            onClick={() => changeMajor(major.id)}
                            disabled={isLoading}
                            className={`${getMajorColorClasses(major.id, selectedMajorId === major.id)} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {selectedMajorId === major.id && isLoading ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            ) : selectedMajorId === major.id ? (
                                <CheckCircle2 size={14} className="mr-1" />
                            ) : null}
                            {major.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Study Plan Selector - only show for majors with multiple study plans */}
            {hasStudyPlans && (
                <div className="px-2 pb-2">
                    <div className="text-xs text-gray-400 mb-1">Plan de estudios:</div>
                    <div className="flex space-x-1">
                        {Object.values(currentMajor.studyPlans).map((studyPlan) => (
                            <button
                                key={studyPlan.id}
                                onClick={() => changeStudyPlan(studyPlan.id)}
                                disabled={isLoading}
                                className={`px-2 py-1 rounded text-xs font-medium ${selectedStudyPlan === studyPlan.id
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {studyPlan.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MajorSelector;

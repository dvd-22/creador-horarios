import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useMajorContext } from '../contexts/MajorContext';
import MajorSelector from './MajorSelector';
import ProfessorRating from './ProfessorRating';
import { professorRatingService } from '../services/professorRatingService';

const semesterOrder = [
  'Primer Semestre',
  'Segundo Semestre',
  'Tercer Semestre',
  'Cuarto Semestre',
  'Quinto Semestre',
  'Sexto Semestre',
  'Séptimo Semestre',
  'Octavo Semestre',
  'Noveno Semestre',
  'Optativas'
];

// Helper function to get semester order priority
const getSemesterOrderPriority = (semesterName) => {
  const index = semesterOrder.indexOf(semesterName);
  if (index !== -1) {
    return index;
  }

  // Handle special case for "Optativas de los niveles" with Roman numerals
  if (semesterName.startsWith('Optativas de los niveles')) {
    // Extract the Roman numerals part
    const romanPart = semesterName.replace('Optativas de los niveles ', '');

    // Define priority based on Roman numerals
    if (romanPart.includes('I,II,III,IV')) {
      return 1000; // First optativas group
    } else if (romanPart.includes('V,VI') || romanPart.includes('V, VI')) {
      return 1001; // Second optativas group
    } else if (romanPart.includes('VII,VIII') || romanPart.includes('VII, VIII')) {
      return 1002; // Third optativas group
    }

    // Fallback for other Roman numeral patterns
    return 1003;
  }

  // For other optativas or unknown semesters, sort alphabetically after main optativas
  return 2000 + semesterName.localeCompare('');
};

const ScheduleSelector = ({ onGroupSelect, selectedGroups }) => {
  const { selectedMajorId, majorData, isLoading, loadError } = useMajorContext();
  const [openSemesters, setOpenSemesters] = useState({});
  const [openSubjects, setOpenSubjects] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSemester = (semester) => {
    setOpenSemesters(prev => ({
      ...prev,
      [semester]: !prev[semester]
    }));
  };

  const toggleSubject = (subject) => {
    setOpenSubjects(prev => ({
      ...prev,
      [subject]: !prev[subject]
    }));
  };

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ?
        <span key={index} className="bg-yellow-500/30 text-white">{part}</span> :
        part
    );
  };

  // Helper function to order data properly - moved before useMemo
  const getOrderedData = (data) => {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const orderedData = {};

    // Get all semesters and sort them properly
    const allSemesters = Object.keys(data);
    const sortedSemesters = allSemesters.sort((a, b) => {
      const priorityA = getSemesterOrderPriority(a);
      const priorityB = getSemesterOrderPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority, sort alphabetically as fallback
      return a.localeCompare(b, 'es', { sensitivity: 'base' });
    });

    // Process each semester in order
    sortedSemesters.forEach(semester => {
      if (data[semester] && typeof data[semester] === 'object') {
        // Sort subjects alphabetically
        const sortedSubjects = Object.keys(data[semester]).sort((a, b) =>
          a.localeCompare(b, 'es', { sensitivity: 'base' })
        );

        const orderedSubjects = {};
        sortedSubjects.forEach(subject => {
          orderedSubjects[subject] = data[semester][subject];
        });

        orderedData[semester] = orderedSubjects;
      }
    });

    return orderedData;
  };

  const filteredScheduleData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      // If no search query, return data with proper ordering
      return getOrderedData(majorData);
    }

    const filtered = {};

    if (!majorData || typeof majorData !== 'object') {
      console.error('Schedule data is not properly loaded:', majorData);
      return {};
    }

    Object.entries(majorData).forEach(([semester, subjects]) => {
      const filteredSubjects = {};

      Object.entries(subjects).forEach(([subject, groups]) => {
        const filteredGroups = {};

        Object.entries(groups).forEach(([groupNum, groupData]) => {
          const matchesGroup = groupNum.toLowerCase().includes(query);
          const matchesProfessor = groupData?.profesor?.nombre?.toLowerCase()?.includes(query) || false;
          const matchesAyudante = groupData?.ayudantes?.some(
            ayudante => ayudante?.nombre?.toLowerCase()?.includes(query)
          ) || false;
          const matchesSubject = subject.toLowerCase().includes(query);
          const matchesSemester = semester.toLowerCase().includes(query);
          const matchesSalon = groupData?.salon?.toLowerCase()?.includes(query) || false;
          const matchesModalidad = groupData?.modalidad?.toLowerCase()?.includes(query) || false;

          if (matchesGroup || matchesProfessor || matchesAyudante || matchesSubject || matchesSemester ||
            matchesSalon || matchesModalidad) {
            filteredGroups[groupNum] = groupData;
          }
        });

        if (Object.keys(filteredGroups).length > 0) {
          filteredSubjects[subject] = filteredGroups;
        }
      });

      if (Object.keys(filteredSubjects).length > 0) {
        filtered[semester] = filteredSubjects;
      }
    });

    return getOrderedData(filtered);
  }, [searchQuery, majorData]);

  useEffect(() => {
    const loadVisibleProfessorRatings = async () => {
    };

    loadVisibleProfessorRatings();
  }, [filteredScheduleData]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const matchingSemesters = {};
      const matchingSubjects = {};

      Object.keys(filteredScheduleData).forEach(semester => {
        matchingSemesters[semester] = true;
        Object.keys(filteredScheduleData[semester] || {}).forEach(subject => {
          matchingSubjects[subject] = true;
        });
      });

      setOpenSemesters(matchingSemesters);
      setOpenSubjects(matchingSubjects);
    } else {
      setOpenSemesters({});
      setOpenSubjects({});
    }
  }, [searchQuery, filteredScheduleData]);

  const renderGroupCard = (group, groupData, semester, subject) => (
    <div
      key={group}
      className={`bg-gray-800 p-2 rounded mb-2 text-sm border cursor-pointer ${selectedGroups.some(g =>
        g.semester === semester &&
        g.subject === subject &&
        g.group === group
      ) ? 'border-blue-500' : 'border-gray-700'
        }`}
      onClick={() => onGroupSelect(semester, subject, group, groupData, selectedMajorId)}
    >
      <h4 className="font-bold text-gray-100 mb-1">
        Grupo {highlightText(group, searchQuery)}
      </h4>
      <div className="space-y-2">
        {/* Location and Modality Info */}
        {(groupData?.salon || groupData?.modalidad) && (
          <div className="flex flex-wrap gap-x-2 mb-1 text-xs">
            {groupData?.salon && (
              <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded">
                <span className="mr-1">🏫</span>
                {highlightText(groupData.salon, searchQuery)}
              </span>
            )}
            {groupData?.modalidad && (
              <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded">
                <span className="mr-1">
                  {groupData.modalidad === "Presencial" ? "👨‍🏫" : "💻"}
                </span>
                {highlightText(groupData.modalidad, searchQuery)}
              </span>
            )}
          </div>
        )}

        {/* Professor Info */}
        {groupData?.profesor?.nombre && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-gray-200 text-sm">
                {highlightText(groupData.profesor.nombre, searchQuery)}
              </p>
              <ProfessorRating
                professorName={groupData.profesor.nombre}
                className="text-xs"
              />
            </div>
            {groupData?.profesor?.horarios?.map((schedule, index) => (
              schedule?.horario && schedule?.dias && schedule.dias.length > 0 ? (
                <p key={index} className="text-gray-400 text-xs">
                  {schedule.horario} ({schedule.dias.join(", ")})
                </p>
              ) : null
            ))}
          </div>
        )}

        {/* Presentation Button */}
        {groupData?.presentacion && (
          <div className="mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering group selection
                window.open(groupData.presentacion, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              <span className="mr-1">📄</span>
              Presentación
            </button>
          </div>
        )}

        {/* Assistants Info */}
        {groupData?.ayudantes && groupData.ayudantes.length > 0 && (
          <div className="border-t border-gray-700 pt-1 mt-1">
            <p className="text-gray-300 text-xs font-medium">Ayudantes:</p>
            {groupData.ayudantes.map((ayudante, index) => (
              // Only display assistants if they have some data to show
              ((ayudante?.nombre || ayudante?.horario || (ayudante?.dias && ayudante.dias.length > 0)) && (
                <div key={index} className="ml-1">
                  {/* Show name or default text if name is null but other data exists */}
                  <p className="text-gray-200 text-sm">
                    {highlightText(ayudante?.nombre || "Ayudante no asignado", searchQuery)}
                  </p>
                  {/* Only show schedule if it exists and has associated days */}
                  {ayudante?.horario && ayudante?.dias && ayudante.dias.length > 0 && (
                    <p className="text-gray-400 text-xs">
                      {ayudante.horario} ({ayudante.dias.join(", ")})
                    </p>
                  )}
                </div>
              ))
            ))}
          </div>
        )}

        {/* Note Info */}
        {groupData?.nota && (
          <div className="border-t border-gray-700 pt-1 mt-1">
            <p className="text-yellow-200 text-xs italic">&#x1F6C8; {groupData.nota}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pl-8 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
            autoComplete="off"
          />
          <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
        </div>
        {searchQuery && Object.keys(filteredScheduleData).length === 0 && (
          <p className="mt-2 text-sm text-gray-400">No se encontraron resultados</p>
        )}
      </div>

      <MajorSelector />

      <div className="flex-1 overflow-y-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando datos...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {loadError && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-gray-400">Error al cargar los datos</p>
              <p className="text-sm text-gray-500 mt-1">{loadError}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !loadError && (
          <div className="p-2">
            {Object.entries(filteredScheduleData || {}).map(([semester, subjects]) => (
              <div key={semester} className="mb-3 border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSemester(semester)}
                  className="w-full p-2 bg-gray-800 hover:bg-gray-700 flex items-center justify-between text-gray-100 text-sm"
                >
                  <span className="font-semibold text-left">
                    {highlightText(semester, searchQuery)}
                  </span>
                  {openSemesters[semester] ?
                    <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> :
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  }
                </button>

                {openSemesters[semester] && (
                  <div className="p-2 space-y-2">
                    {Object.entries(subjects).map(([subject, groups]) => (
                      <div key={subject} className="border border-gray-700 rounded-lg">
                        <button
                          onClick={() => toggleSubject(subject)}
                          className="w-full p-2 bg-gray-800 hover:bg-gray-700 flex items-center justify-between text-gray-100 text-sm"
                        >
                          <span className="font-medium text-left pr-2">
                            {highlightText(subject, searchQuery)}
                          </span>
                          {openSubjects[subject] ?
                            <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> :
                            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                          }
                        </button>

                        {openSubjects[subject] && (
                          <div className="p-2 bg-gray-900">
                            {Object.entries(groups).map(([group, groupData]) =>
                              renderGroupCard(group, groupData, semester, subject)
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleSelector;
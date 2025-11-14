import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useMajorContext } from '../contexts/MajorContext';
import MajorSelector from './MajorSelector';
import ProfessorRating from './ProfessorRating';
import { professorRatingService } from '../services/professorRatingService';

// Utility function to normalize text for search (remove accents, convert to lowercase)
const normalizeText = (text) => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

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

const ScheduleSelector = ({ onGroupSelect, selectedGroups, onRevealGroup, overlapToggle }) => {
  const { selectedMajorId, selectedStudyPlan, majorData, isLoading, loadError, changeMajor, changeStudyPlan, currentMajor } = useMajorContext();
  const [openSemesters, setOpenSemesters] = useState({});
  const [openSubjects, setOpenSubjects] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Expose reveal function via callback
  useEffect(() => {
    if (onRevealGroup) {
      onRevealGroup((compositeMajorId, studyPlanId, semester, subject, group) => {
        // Extract base major ID and study plan from composite ID if needed
        // e.g., "biology-2025" -> majorId: "biology", studyPlanId: "2025"
        let majorId = compositeMajorId;
        let planId = studyPlanId;

        // If compositeMajorId contains a hyphen, it's a composite ID - split it
        if (compositeMajorId && compositeMajorId.includes('-')) {
          const parts = compositeMajorId.split('-');
          majorId = parts[0];
          // Use the planId from the composite if we don't already have one
          if (!planId) {
            planId = parts[1];
          }
        }

        // Check if we need to switch major or study plan
        const needMajorSwitch = majorId && majorId !== selectedMajorId;
        const needPlanSwitch = planId && planId !== selectedStudyPlan;

        if (needMajorSwitch || needPlanSwitch) {
          // Switch major and study plan together to avoid race conditions
          if (needMajorSwitch) {
            changeMajor(majorId, planId); // Pass study plan along with major change
          } else if (needPlanSwitch && planId) {
            // Only plan needs to change
            changeStudyPlan(planId);
          }

          // Need to wait for major/plan change to complete before opening/scrolling
          setTimeout(() => {
            // Open the semester and subject
            setOpenSemesters(prev => ({ ...prev, [semester]: true }));
            setOpenSubjects(prev => ({ ...prev, [subject]: true }));

            // Scroll to the specific group if possible - position at 20% from top
            setTimeout(() => {
              const groupElement = document.getElementById(`group-${semester.replace(/\s+/g, '-')}-${subject.replace(/\s+/g, '-')}-${group}`);
              if (groupElement) {
                // Find the scrollable container
                const scrollContainer = groupElement.closest('.overflow-y-auto');

                if (scrollContainer) {
                  // Calculate the position to place element at 20% from top of container
                  const containerHeight = scrollContainer.clientHeight;
                  const elementTop = groupElement.offsetTop;

                  // Add extra margin (in pixels) to account for search bar and major selector
                  const topMargin = 150; // Increased margin for better visibility

                  // Calculate scroll position: element top should be at 20% of container height + margin
                  const scrollTo = elementTop - (containerHeight * 0.2) - topMargin;

                  // Smooth scroll to the calculated position
                  scrollContainer.scrollTo({
                    top: scrollTo,
                    behavior: 'smooth'
                  });
                } else {
                  // Fallback to scrollIntoView if container not found
                  groupElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }
            }, 150);
          }, 300); // Wait for major/plan change
        } else {
          // Same major and plan - just open and scroll
          setOpenSemesters(prev => ({ ...prev, [semester]: true }));
          setOpenSubjects(prev => ({ ...prev, [subject]: true }));

          // Scroll to the specific group if possible - position at 20% from top
          setTimeout(() => {
            const groupElement = document.getElementById(`group-${semester.replace(/\s+/g, '-')}-${subject.replace(/\s+/g, '-')}-${group}`);
            if (groupElement) {
              // Find the scrollable container
              const scrollContainer = groupElement.closest('.overflow-y-auto');

              if (scrollContainer) {
                // Calculate the position to place element at 20% from top of container
                const containerHeight = scrollContainer.clientHeight;
                const elementTop = groupElement.offsetTop;

                // Add extra margin (in pixels) to account for search bar and major selector
                const topMargin = 150; // Increased margin for better visibility

                // Calculate scroll position: element top should be at 20% of container height + margin
                const scrollTo = elementTop - (containerHeight * 0.2) - topMargin;

                // Smooth scroll to the calculated position
                scrollContainer.scrollTo({
                  top: scrollTo,
                  behavior: 'smooth'
                });
              } else {
                // Fallback to scrollIntoView if container not found
                groupElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }, 150);
        }
      });
    }
  }, [onRevealGroup, selectedMajorId, selectedStudyPlan, changeMajor, changeStudyPlan]);

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

    const normalizedText = normalizeText(text);
    const normalizedQuery = normalizeText(query.trim());

    if (!normalizedText.includes(normalizedQuery)) return text;

    // Find the position in the normalized text
    const index = normalizedText.indexOf(normalizedQuery);
    if (index === -1) return text;

    // Extract the matching part from the original text
    const before = text.substring(0, index);
    const match = text.substring(index, index + normalizedQuery.length);
    const after = text.substring(index + normalizedQuery.length);

    return (
      <>
        {before}
        <span className="bg-yellow-500/30 text-white">{match}</span>
        {after}
      </>
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
    if (!searchQuery.trim()) return getOrderedData(majorData || {});

    const normalizedQuery = normalizeText(searchQuery.trim());
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
          // Search in all possible fields
          const searchFields = [
            groupNum, // Group number
            groupData?.profesor?.nombre, // Professor name
            subject, // Subject name
            semester, // Semester name
            groupData?.salon, // Classroom
            groupData?.modalidad, // Modality
            groupData?.nota, // Notes
            ...(groupData?.ayudantes?.map(ayudante => ayudante?.nombre) || []) // Assistant names
          ];

          // Search in professor schedules
          let professorScheduleMatches = false;
          if (groupData?.profesor?.horarios) {
            professorScheduleMatches = groupData.profesor.horarios.some(schedule =>
              normalizeText(schedule.horario || '').includes(normalizedQuery)
            );
          }

          // Search in assistant schedules
          let assistantScheduleMatches = false;
          if (groupData?.ayudantes) {
            assistantScheduleMatches = groupData.ayudantes.some(ayudante =>
              normalizeText(ayudante?.horario || '').includes(normalizedQuery) ||
              normalizeText(ayudante?.salon || '').includes(normalizedQuery)
            );
          }

          // Check if any field matches
          const fieldMatches = searchFields.some(field =>
            field && normalizeText(field).includes(normalizedQuery)
          );

          if (fieldMatches || professorScheduleMatches || assistantScheduleMatches) {
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
      id={`group-${semester.replace(/\s+/g, '-')}-${subject.replace(/\s+/g, '-')}-${group}`}
      className={`bg-gray-800 p-2 rounded mb-2 text-sm border cursor-pointer ${selectedGroups.some(g =>
        g.semester === semester &&
        g.subject === subject &&
        g.group === group
      ) ? 'border-blue-500' : 'border-gray-700'
        }`}
      onClick={() => {
        // Build a comprehensive majorId that includes study plan if applicable
        const fullMajorId = currentMajor?.hasStudyPlans && selectedStudyPlan
          ? `${selectedMajorId}-${selectedStudyPlan}`
          : selectedMajorId;
        onGroupSelect(semester, subject, group, groupData, fullMajorId, selectedStudyPlan);
      }}
    >
      <h4 className="font-bold text-gray-100 mb-1">
        Grupo {highlightText(group, searchQuery)}
      </h4>
      <div className="space-y-2">
        {/* Location and Modality Info */}
        {(groupData?.salon || groupData?.modalidad) && (
          <div className="flex flex-wrap gap-x-2 mb-1 text-xs">
            {groupData?.salon ? (
              // If classroom is available, show the classroom
              <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded">
                <span className="mr-1">🏫</span>
                {highlightText(groupData.salon, searchQuery)}
              </span>
            ) : groupData?.modalidad ? (
              // If no classroom but modality exists, show modality (Virtual, En línea, etc.)
              <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded">
                <span className="mr-1">
                  {groupData.modalidad === "Presencial" ? "👨‍🏫" : "💻"}
                </span>
                {highlightText(groupData.modalidad, searchQuery)}
              </span>
            ) : null}
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
                  {highlightText(schedule.horario, searchQuery)} ({schedule.dias.join(", ")})
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
                      {highlightText(ayudante.horario, searchQuery)} ({ayudante.dias.join(", ")})
                      {/* Show assistant's salon if different from professor's or if no professor salon */}
                      {ayudante?.salon && (
                        <span className="ml-1 text-blue-300">
                          🏫 {highlightText(ayudante.salon, searchQuery)}
                        </span>
                      )}
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
            <p className="text-yellow-200 text-xs italic">&#x1F6C8; {highlightText(groupData.nota, searchQuery)}</p>
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
      </div>

      {/* Overlap toggle - only show on mobile when passed as prop */}
      {overlapToggle && overlapToggle}

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
            {/* No results message when searching */}
            {searchQuery && Object.keys(filteredScheduleData || {}).length === 0 && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-gray-500 mb-2">🔍</div>
                  <p className="text-gray-400">No se encontraron resultados</p>
                </div>
              </div>
            )}

            {/* Results */}
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
                      <div
                        key={subject}
                        id={`subject-${subject.replace(/\s+/g, '-')}`}
                        className="border border-gray-700 rounded-lg"
                      >
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
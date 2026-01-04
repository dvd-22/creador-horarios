import React, { useState, useMemo, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { ChevronDown, ChevronRight, Search, Filter, Plus, X } from 'lucide-react';
import { useMajorContext } from '../contexts/MajorContext';
import MajorSelector from './MajorSelector';
import ProfessorRating from './ProfessorRating';
import FilterModal from './FilterModal';
import SpacerModal from './SpacerModal';
import { professorRatingService } from '../services/professorRatingService';

const normalizeText = (text) => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const scheduleMatchesFilter = (horario, filters) => {
  if (!horario) return false;

  if (filters.days && filters.days.length < 6 && horario.dias) {
    const dayMap = { 'L': 'Lu', 'M': 'Ma', 'I': 'Mi', 'J': 'Ju', 'V': 'Vi', 'S': 'Sa' };
    const scheduleDays = horario.dias;
    const allDaysAllowed = scheduleDays.every(day => {
      const filterId = Object.keys(dayMap).find(key => dayMap[key] === day);
      return filterId && filters.days.includes(filterId);
    });
    if (!allDaysAllowed) return false;
  }

  const hasTimeFilters = filters.startTime || filters.endTime || filters.exactTimes.length > 0 || (filters.blockedHours && filters.blockedHours.length > 0);
  if (!hasTimeFilters) return true;

  const timeMatch = horario.horario.match(/^(\d{2}:\d{2})/);
  if (!timeMatch) return false;
  const scheduleStartTime = timeMatch[1];

  const scheduleMatch = horario.horario.match(/^(\d{2}:\d{2})\s*a\s*(\d{2}:\d{2})/);
  if (!scheduleMatch) return false;
  const scheduleStart = timeToMinutes(scheduleMatch[1]);
  const scheduleEnd = timeToMinutes(scheduleMatch[2]);

  if (filters.blockedHours && filters.blockedHours.length > 0) {
    const hasOverlap = filters.blockedHours.some(block => {
      const blockStart = timeToMinutes(block.startTime);
      const blockEnd = timeToMinutes(block.endTime);
      return !(scheduleEnd <= blockStart || scheduleStart >= blockEnd);
    });
    if (hasOverlap) return false;
  }

  if (filters.mode === 'exact') {
    return filters.exactTimes.includes(scheduleStartTime);
  } else {
    if (!filters.startTime || !filters.endTime) return true;
    const filterStart = timeToMinutes(filters.startTime);
    const filterEnd = timeToMinutes(filters.endTime);
    return scheduleStart >= filterStart && scheduleEnd <= filterEnd;
  }
};

const semesterOrder = [
  'Primer Semestre', 'Segundo Semestre', 'Tercer Semestre', 'Cuarto Semestre',
  'Quinto Semestre', 'Sexto Semestre', 'Séptimo Semestre', 'Octavo Semestre',
  'Noveno Semestre', 'Optativas'
];

const getSemesterOrderPriority = (semesterName) => {
  const index = semesterOrder.indexOf(semesterName);
  if (index !== -1) return index;

  if (semesterName.startsWith('Optativas de los niveles')) {
    const romanPart = semesterName.replace('Optativas de los niveles ', '');
    if (romanPart.includes('I,II,III,IV')) return 1000;
    if (romanPart.includes('V,VI') || romanPart.includes('V, VI')) return 1001;
    if (romanPart.includes('VII,VIII') || romanPart.includes('VII, VIII')) return 1002;
    return 1003;
  }

  return 2000 + semesterName.localeCompare('');
};

const ScheduleSelector = ({ onGroupSelect, selectedGroups, onRevealGroup, overlapToggle, onSpacerSave }) => {
  const { selectedMajorId, selectedStudyPlan, majorData, isLoading, loadError, changeMajor, changeStudyPlan, currentMajor, filters, updateFilters } = useMajorContext();
  const [openSemesters, setOpenSemesters] = useState({});
  const [openSubjects, setOpenSubjects] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSpacerModalOpen, setIsSpacerModalOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.days && filters.days.length < 6) count++;
    if (filters.startTime || filters.endTime) count++;
    if (filters.blockedHours && filters.blockedHours.length > 0) count++;
    if (filters.modalities && filters.modalities.length < 2) count++;
    return count;
  }, [filters]);

  useEffect(() => {
    if (onRevealGroup) {
      onRevealGroup((compositeMajorId, studyPlanId, semester, subject, group) => {
        flushSync(() => {
          setSearchQuery('');
        });

        let majorId = compositeMajorId;
        let planId = studyPlanId;

        if (compositeMajorId && compositeMajorId.includes('-')) {
          const parts = compositeMajorId.split('-');
          majorId = parts[0];
          if (!planId) planId = parts[1];
        }

        const needMajorSwitch = majorId && majorId !== selectedMajorId;
        const needPlanSwitch = planId && planId !== selectedStudyPlan;

        if (needMajorSwitch || needPlanSwitch) {
          if (needMajorSwitch) {
            changeMajor(majorId, planId);
          } else if (needPlanSwitch && planId) {
            changeStudyPlan(planId);
          }

          setTimeout(() => {
            setOpenSemesters(prev => ({ ...prev, [semester]: true }));
            setOpenSubjects(prev => ({ ...prev, [subject]: true }));

            const scrollToGroup = () => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const groupId = `group-${semester.replace(/\s+/g, '-')}-${subject.replace(/\s+/g, '-')}-${group}`;
                  console.log('🔍 Looking for element:', groupId);
                  const groupElement = document.getElementById(groupId);

                  if (groupElement) {
                    console.log('✅ Element found!');
                    const scrollContainer = groupElement.closest('.overflow-y-auto');

                    if (scrollContainer) {
                      const containerHeight = scrollContainer.clientHeight;
                      const elementTop = groupElement.offsetTop;
                      const topMargin = 150;
                      const scrollTo = elementTop - (containerHeight * 0.2) - topMargin;

                      console.log('📜 Scrolling to position:', scrollTo);
                      scrollContainer.scrollTo({ top: scrollTo, behavior: 'smooth' });
                    } else {
                      groupElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  } else {
                    console.log('❌ Element not found');
                  }
                });
              });
            };

            scrollToGroup();
          }, 500);
        } else {
          setOpenSemesters(prev => ({ ...prev, [semester]: true }));
          setOpenSubjects(prev => ({ ...prev, [subject]: true }));

          const scrollToGroup = () => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const groupId = `group-${semester.replace(/\s+/g, '-')}-${subject.replace(/\s+/g, '-')}-${group}`;
                console.log('🔍 Looking for element:', groupId);
                const groupElement = document.getElementById(groupId);

                if (groupElement) {
                  console.log('✅ Element found!');
                  const scrollContainer = groupElement.closest('.overflow-y-auto');

                  if (scrollContainer) {
                    const containerHeight = scrollContainer.clientHeight;
                    const elementTop = groupElement.offsetTop;
                    const topMargin = 150;
                    const scrollTo = elementTop - (containerHeight * 0.2) - topMargin;

                    console.log('📜 Scrolling to position:', scrollTo);
                    scrollContainer.scrollTo({ top: scrollTo, behavior: 'smooth' });
                  } else {
                    groupElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                } else {
                  console.log('❌ Element not found');
                }
              });
            });
          };

          scrollToGroup();
        }
      });
    }
  }, [onRevealGroup, selectedMajorId, selectedStudyPlan, changeMajor, changeStudyPlan]);

  const toggleSemester = (semester) => {
    setOpenSemesters(prev => ({ ...prev, [semester]: !prev[semester] }));
  };

  const toggleSubject = (subject) => {
    setOpenSubjects(prev => ({ ...prev, [subject]: !prev[subject] }));
  };

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;

    const normalizedText = normalizeText(text);
    const normalizedQuery = normalizeText(query.trim());
    if (!normalizedText.includes(normalizedQuery)) return text;

    const index = normalizedText.indexOf(normalizedQuery);
    if (index === -1) return text;

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

  const getOrderedData = (data) => {
    if (!data || typeof data !== 'object') return {};

    const orderedData = {};
    const allSemesters = Object.keys(data);
    const sortedSemesters = allSemesters.sort((a, b) => {
      const priorityA = getSemesterOrderPriority(a);
      const priorityB = getSemesterOrderPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.localeCompare(b, 'es', { sensitivity: 'base' });
    });

    sortedSemesters.forEach(semester => {
      if (data[semester] && typeof data[semester] === 'object') {
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
    const orderedData = getOrderedData(majorData || {});

    const noFiltersApplied = !searchQuery.trim() &&
      !filters.startTime &&
      !filters.endTime &&
      filters.exactTimes.length === 0 &&
      (!filters.days || filters.days.length === 6) &&
      (!filters.blockedHours || filters.blockedHours.length === 0) &&
      (!filters.modalities || filters.modalities.length === 2);

    if (noFiltersApplied) return orderedData;

    const normalizedQuery = normalizeText(searchQuery.trim());
    const filtered = {};

    if (!majorData || typeof majorData !== 'object') {
      console.error('Schedule data is not properly loaded:', majorData);
      return {};
    }

    Object.entries(orderedData).forEach(([semester, subjects]) => {
      const filteredSubjects = {};

      Object.entries(subjects).forEach(([subject, groups]) => {
        const filteredGroups = {};

        Object.entries(groups).forEach(([groupNum, groupData]) => {
          let matchesTimeFilter = true;

          if (filters.startTime || filters.endTime || filters.exactTimes.length > 0 || (filters.days && filters.days.length < 6) || (filters.blockedHours && filters.blockedHours.length > 0)) {
            const professorSchedulesMatch = groupData?.profesor?.horarios?.every(schedule =>
              scheduleMatchesFilter(schedule, filters)
            ) || false;

            let assistantsMatch = true;
            if (groupData?.ayudantes && groupData.ayudantes.length > 0) {
              assistantsMatch = groupData.ayudantes.every(ayudante => {
                if (!ayudante.horario || !ayudante.dias) return true;
                const assistantSchedule = {
                  horario: ayudante.horario,
                  dias: ayudante.dias
                };
                return scheduleMatchesFilter(assistantSchedule, filters);
              });
            }

            matchesTimeFilter = professorSchedulesMatch && assistantsMatch;
          }

          if (!matchesTimeFilter) return;

          if (filters.modalities && filters.modalities.length < 2) {
            const modalidad = groupData?.modalidad;
            if (modalidad && !filters.modalities.includes(modalidad)) return;
          }

          if (searchQuery.trim()) {
            const searchFields = [
              groupNum,
              groupData?.profesor?.nombre,
              subject,
              semester,
              groupData?.salon,
              groupData?.modalidad,
              groupData?.nota,
              ...(groupData?.ayudantes?.map(ayudante => ayudante?.nombre) || [])
            ];

            let professorScheduleMatches = false;
            if (groupData?.profesor?.horarios) {
              professorScheduleMatches = groupData.profesor.horarios.some(schedule =>
                normalizeText(schedule.horario || '').includes(normalizedQuery)
              );
            }

            let assistantScheduleMatches = false;
            if (groupData?.ayudantes) {
              assistantScheduleMatches = groupData.ayudantes.some(ayudante =>
                normalizeText(ayudante?.horario || '').includes(normalizedQuery) ||
                normalizeText(ayudante?.salon || '').includes(normalizedQuery)
              );
            }

            const fieldMatches = searchFields.some(field =>
              field && normalizeText(field).includes(normalizedQuery)
            );

            if (!fieldMatches && !professorScheduleMatches && !assistantScheduleMatches) return;
          }

          filteredGroups[groupNum] = groupData;
        });

        if (Object.keys(filteredGroups).length > 0) {
          filteredSubjects[subject] = filteredGroups;
        }
      });

      if (Object.keys(filteredSubjects).length > 0) {
        filtered[semester] = filteredSubjects;
      }
    });

    return filtered;
  }, [searchQuery, majorData, filters]);

  useEffect(() => {
    const loadVisibleProfessorRatings = async () => {};
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
        g.semester === semester && g.subject === subject && g.group === group
      ) ? 'border-blue-500' : 'border-gray-700'}`}
      onClick={() => {
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
        {(groupData?.salon || groupData?.modalidad) && (
          <div className="flex flex-wrap gap-x-2 mb-1 text-xs">
            {groupData?.salon ? (
              <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded">
                <span className="mr-1">🏫</span>
                {highlightText(groupData.salon, searchQuery)}
              </span>
            ) : groupData?.modalidad ? (
              <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded">
                <span className="mr-1">{groupData.modalidad === "Presencial" ? "👨‍🏫" : "💻"}</span>
                {highlightText(groupData.modalidad, searchQuery)}
              </span>
            ) : null}
          </div>
        )}

        {groupData?.profesor?.nombre && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-gray-200 text-sm">
                {highlightText(groupData.profesor.nombre, searchQuery)}
              </p>
              <ProfessorRating professorName={groupData.profesor.nombre} className="text-xs" />
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

        {groupData?.presentacion && (
          <div className="mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(groupData.presentacion, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              <span className="mr-1">📄</span>
              Presentación
            </button>
          </div>
        )}

        {groupData?.ayudantes && groupData.ayudantes.length > 0 && (
          <div className="border-t border-gray-700 pt-1 mt-1">
            <p className="text-gray-300 text-xs font-medium">Ayudantes:</p>
            {groupData.ayudantes.map((ayudante, index) => (
              ((ayudante?.nombre || ayudante?.horario || (ayudante?.dias && ayudante.dias.length > 0)) && (
                <div key={index} className="ml-1">
                  <p className="text-gray-200 text-sm">
                    {highlightText(ayudante?.nombre || "Ayudante no asignado", searchQuery)}
                  </p>
                  {ayudante?.horario && ayudante?.dias && ayudante.dias.length > 0 && (
                    <p className="text-gray-400 text-xs">
                      {highlightText(ayudante.horario, searchQuery)} ({ayudante.dias.join(", ")})
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
        <div className="flex gap-2 items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full py-2 pl-8 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
              autoComplete="off"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            {searchQuery && (
              <X
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 cursor-pointer transition-colors"
                size={16}
              />
            )}
          </div>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`relative px-3 py-2 rounded-lg border transition-colors flex items-center justify-center ${activeFilterCount > 0
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            aria-label="Filtros"
            title="Filtros de horario"
          >
            <Filter size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApplyFilters={updateFilters}
      />

      <SpacerModal
        isOpen={isSpacerModalOpen}
        onClose={() => setIsSpacerModalOpen(false)}
        onSave={onSpacerSave}
      />

      <div className="px-4 py-2 border-b border-gray-700">
        <button
          onClick={() => setIsSpacerModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Agregar Horario Personal</span>
        </button>
      </div>

      <MajorSelector />

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando datos...</p>
            </div>
          </div>
        )}

        {loadError && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-gray-400">Error al cargar los datos</p>
              <p className="text-sm text-gray-500 mt-1">{loadError}</p>
            </div>
          </div>
        )}

        {!isLoading && !loadError && (
          <div className="p-2 pb-24">
            {searchQuery && Object.keys(filteredScheduleData || {}).length === 0 && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-gray-500 mb-2">🔍</div>
                  <p className="text-gray-400">No se encontraron resultados</p>
                </div>
              </div>
            )}

            {Object.entries(filteredScheduleData || {}).map(([semester, subjects]) => (
              <div key={semester} className="mb-3 border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSemester(semester)}
                  className="w-full p-2 bg-gray-800 hover:bg-gray-700 flex items-center justify-between text-gray-100 text-sm"
                >
                  <span className="font-semibold text-left">{highlightText(semester, searchQuery)}</span>
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
                          <span className="font-medium text-left pr-2">{highlightText(subject, searchQuery)}</span>
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

      {overlapToggle && overlapToggle}
    </div>
  );
};

export default ScheduleSelector;

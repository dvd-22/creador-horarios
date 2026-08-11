import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, DoorOpen, Filter, ScanSearch } from 'lucide-react'
import { loadAllScrapedData } from '../utils/scrapedData'

const dayOptions = [
	{ id: 'Lu', label: 'Lu' },
	{ id: 'Ma', label: 'Ma' },
	{ id: 'Mi', label: 'Mi' },
	{ id: 'Ju', label: 'Ju' },
	{ id: 'Vi', label: 'Vi' },
	{ id: 'Sa', label: 'Sa' },
]

const categoryOptions = [
	{ id: 'O', label: 'O' },
	{ id: 'P', label: 'P' },
	{ id: 'others', label: 'Otros' },
]


const timeToMinutes = (time) => {
	if (!time) return null
	const [hours, minutes] = time.split(':').map(Number)
	if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
	return hours * 60 + minutes
}


const parseTimeRange = (timeText) => {
	if (!timeText) return null
	const match = String(timeText).match(/(\d{2}:\d{2}).*?(\d{2}:\d{2})/)
	if (!match) return null

	const start = timeToMinutes(match[1])
	const end = timeToMinutes(match[2])

	if (start === null || end === null || start >= end) {
		return null
	}

	return { start, end }
}

const classifyRoom = (roomName) => {
	const normalized = String(roomName || '').trim().toUpperCase()
	if (/^O-?\d+/.test(normalized)) return 'O'
	if (/^P-?\d+/.test(normalized)) return 'P'
	return 'others'
}

const normalizeRoomName = (roomName) => String(roomName || '').trim()

const getDayLabels = (selectedDays) => {
	return dayOptions
		.filter((day) => selectedDays.includes(day.id))
		.map((day) => day.label)
		.join(', ')
}

const buildRoomInventory = (scrapedDataSets) => {
	const roomMap = new Map()

	const registerUsage = ({ roomName, day, start, end, label }) => {
		const normalizedRoom = normalizeRoomName(roomName)
		if (!normalizedRoom) return

		const existing = roomMap.get(normalizedRoom) || {
			room: normalizedRoom,
			category: classifyRoom(normalizedRoom),
			usages: [],
		}

		existing.usages.push({ day, start, end, label })
		roomMap.set(normalizedRoom, existing)
	}

	const registerSchedule = (roomName, schedule, label) => {
		const range = parseTimeRange(schedule?.horario)
		const days = Array.isArray(schedule?.dias) ? schedule.dias : []

		if (!range || days.length === 0) return

		days.forEach((day) => {
			registerUsage({
				roomName,
				day,
				start: range.start,
				end: range.end,
				label,
			})
		})
	}

	scrapedDataSets.forEach((majorData) => {
		Object.entries(majorData || {}).forEach(([semesterName, semesterData]) => {
			Object.entries(semesterData || {}).forEach(([subjectName, subjectData]) => {
				Object.entries(subjectData || {}).forEach(([groupId, groupData]) => {
					const sharedLabel = `${semesterName} · ${subjectName} · ${groupId}`

					groupData?.profesor?.horarios?.forEach((schedule) => {
						registerSchedule(groupData.salon, schedule, `${sharedLabel} · Profesor`)
					})

					groupData?.ayudantes?.forEach((assistant, assistantIndex) => {
						const assistantLabel = `${sharedLabel} · Ayudante ${assistantIndex + 1}`
						registerSchedule(groupData.salon, assistant, assistantLabel)
						registerSchedule(assistant?.salon, assistant, assistantLabel)
					})
				})
			})
		})
	})

	return Array.from(roomMap.values()).sort((left, right) => {
		const categoryOrder = { O: 0, P: 1, others: 2 }
		if (categoryOrder[left.category] !== categoryOrder[right.category]) {
			return categoryOrder[left.category] - categoryOrder[right.category]
		}

		return left.room.localeCompare(right.room, 'es', { numeric: true, sensitivity: 'base' })
	})
}

const isRoomAvailable = (room, selectedDays, start, end) => {
	return selectedDays.every((day) => {
		return room.usages.every((usage) => {
			if (usage.day !== day) return true
			return usage.end <= start || usage.start >= end
		})
	})
}

const EmptyClassroomFinder = () => {
	const [selectedDays, setSelectedDays] = useState([])
	const [selectedCategories, setSelectedCategories] = useState(['O', 'P', 'others'])
	const [startTime, setStartTime] = useState('17:30')
	const [endTime, setEndTime] = useState('18:30')
	const [roomInventory, setRoomInventory] = useState([])
	const [isLoadingRooms, setIsLoadingRooms] = useState(true)
	const [loadError, setLoadError] = useState(null)

	useEffect(() => {
		document.title = 'Papas con pan · Creador de horarios'
	}, [])

	useEffect(() => {
		let cancelled = false

		const loadRooms = async () => {
			setIsLoadingRooms(true)
			setLoadError(null)

			try {
				const scrapedDataSets = await loadAllScrapedData()
				if (cancelled) return
				setRoomInventory(buildRoomInventory(scrapedDataSets))
			} catch (error) {
				if (cancelled) return
				setLoadError(error.message)
				setRoomInventory([])
			} finally {
				if (!cancelled) {
					setIsLoadingRooms(false)
				}
			}
		}

		loadRooms()

		return () => {
			cancelled = true
		}
	}, [])

	const searchWindow = useMemo(() => {
		const start = timeToMinutes(startTime)
		const end = timeToMinutes(endTime)

		if (start === null || end === null || start >= end) {
			return null
		}

		return { start, end }
	}, [startTime, endTime])

	const availableRooms = useMemo(() => {
		if (!searchWindow || selectedDays.length === 0 || selectedCategories.length === 0) {
			return []
		}

		return roomInventory.filter((room) => {
			if (!selectedCategories.includes(room.category)) return false
			return isRoomAvailable(room, selectedDays, searchWindow.start, searchWindow.end)
		})
	}, [roomInventory, selectedCategories, selectedDays, searchWindow])

	const roomsByCategory = useMemo(() => {
		return categoryOptions.reduce((accumulator, category) => {
			accumulator[category.id] = availableRooms.filter((room) => room.category === category.id)
			return accumulator
		}, {})
	}, [availableRooms])

	const toggleDay = (dayId) => {
		setSelectedDays((currentDays) => {
			// Single-select: clicking the active day deselects it, otherwise select only this day
			if (currentDays.includes(dayId)) {
				return []
			}
			return [dayId]
		})
	}

	const toggleCategory = (categoryId) => {
		setSelectedCategories((currentCategories) => {
			if (currentCategories.includes(categoryId)) {
				return currentCategories.filter((category) => category !== categoryId)
			}

			return [...currentCategories, categoryId]
		})
	}

	return (
		<div className="h-full overflow-y-auto bg-gray-900 text-white">
			<div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
<<<<<<< HEAD
				<header className="rounded-2xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div className="space-y-3">
							<a
								href={`${import.meta.env.BASE_URL}`}
								className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-gray-700 px-3 py-1 text-xs font-medium text-gray-200 transition hover:bg-gray-600"
							>
								<ArrowLeft size={14} />
								Volver al creador
							</a>
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Sub app secreta</p>
								<h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Papas con pan</h1>
								<p className="mt-3 max-w-3xl text-sm text-gray-300 sm:text-base">
									Busca salones libres en una franja de tiempo usando los horarios scrapeados de la Facultad de Ciencias. Filtra por salones O, P u otros.
								</p>
							</div>
						</div>

						<div className="grid gap-3 rounded-2xl border border-gray-700 bg-gray-850 px-4 py-3 text-sm text-gray-200 sm:grid-cols-3 sm:px-5">
							<div>
								<div className="text-xs uppercase tracking-[0.25em] text-gray-400">Salones detectados</div>
								<div className="mt-1 text-2xl font-bold">{isLoadingRooms ? '...' : roomInventory.length}</div>
							</div>
							<div>
								<div className="text-xs uppercase tracking-[0.25em] text-gray-400">Disponibles</div>
								<div className="mt-1 text-2xl font-bold">{isLoadingRooms ? '...' : availableRooms.length}</div>
							</div>
							<div>
								<div className="text-xs uppercase tracking-[0.25em] text-gray-400">Rango</div>
								<div className="mt-1 text-base font-semibold">
									{searchWindow ? `${minutesToLabel(searchWindow.start)} - ${minutesToLabel(searchWindow.end)}` : 'Rango inválido'}
								</div>
							</div>
						</div>
					</div>
				</header>

				{loadError && (
					<div className="rounded-2xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
						No se pudieron cargar los datos de salones: {loadError}
					</div>
				)}


	)
}

export default EmptyClassroomFinder

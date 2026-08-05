import { useEffect, useMemo, useState } from 'react'
import { Clock3, DoorOpen, Filter, ScanSearch } from 'lucide-react'

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

const scrapedDataModules = import.meta.glob('../data/*.json', { eager: true })
const scrapedDataSets = Object.values(scrapedDataModules).map((module) => module.default)

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

const buildRoomInventory = () => {
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

	useEffect(() => {
		document.title = 'Papas con pan · Creador de horarios'
	}, [])

	const roomInventory = useMemo(() => buildRoomInventory(), [])

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
				<section className="grid gap-4 rounded-2xl border border-gray-700 bg-gray-800 p-4 lg:grid-cols-[1.2fr_1fr_1fr]">
					<div className="space-y-3">
						<label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
							<Clock3 size={16} className="text-blue-400" />
							Horario
						</label>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<label className="text-xs uppercase tracking-[0.25em] text-gray-400">Desde</label>
								<input
									type="time"
									step="300"
									value={startTime}
									onChange={(event) => setStartTime(event.target.value)}
									className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-base text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs uppercase tracking-[0.25em] text-gray-400">Hasta</label>
								<input
									type="time"
									step="300"
									value={endTime}
									onChange={(event) => setEndTime(event.target.value)}
									className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-base text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
								/>
							</div>
						</div>
					</div>

					<div className="space-y-3">
						<label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
							<ScanSearch size={16} className="text-blue-400" />
							Días
						</label>
						<div className="flex flex-wrap gap-2">
							{dayOptions.map((day) => {
								const isActive = selectedDays.includes(day.id)
								return (
									<button
										key={day.id}
										type="button"
										onClick={() => toggleDay(day.id)}
										className={`rounded-full border px-3 py-2 text-sm font-medium transition ${isActive
											? 'border-blue-500 bg-blue-500 text-white'
											: 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
										}`}
									>
										{day.label}
									</button>
								)
							})}
						</div>
					</div>

					<div className="space-y-3">
						<label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
							<Filter size={16} className="text-blue-400" />
							Categorías
						</label>
						<div className="space-y-2">
							{categoryOptions.map((category) => {
								const isActive = selectedCategories.includes(category.id)
								return (
									<button
										key={category.id}
										type="button"
										onClick={() => toggleCategory(category.id)}
										className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${isActive
											? 'border-blue-500 bg-blue-500 text-white'
											: 'border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600'
										}`}
									>
										<span className="font-semibold">{category.label}</span>
										<span className="text-xs uppercase tracking-[0.25em]">{isActive ? 'on' : 'off'}</span>
									</button>
								)
							})}
						</div>
					</div>
				</section>

<section className="rounded-2xl border border-gray-700 bg-gray-800 p-3">
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
						<h2 className="text-base font-semibold text-white">Resultados</h2>
						<p className="text-xs text-gray-400">
							{selectedDays.length > 0 ? `${getDayLabels(selectedDays)}` : 'Selecciona un día'}
						</p>
					</div>

					{!searchWindow || selectedDays.length === 0 || selectedCategories.length === 0 ? (
							<div className="py-16 text-center text-gray-400">
								<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gray-700 bg-gray-700">
									<DoorOpen size={28} className="text-gray-300" />
							</div>
								<p className="mt-4 text-base font-medium text-gray-200">Selecciona un rango de horas válido y al menos un día.</p>
						</div>
					) : availableRooms.length === 0 ? (
							<div className="py-16 text-center text-gray-400">
								<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gray-700 bg-gray-700">
									<DoorOpen size={28} className="text-gray-300" />
							</div>
								<p className="mt-4 text-base font-medium text-gray-200">No se encontraron salones libres con esos filtros.</p>
								<p className="mt-2 text-sm text-gray-400">Prueba cambiar la hora, quitar un día o activar otra categoría.</p>
						</div>
					) : (
						<div className="space-y-4">
							{categoryOptions.map((category) => {
								const rooms = roomsByCategory[category.id] || []
								if (!selectedCategories.includes(category.id) || rooms.length === 0) return null

								return (
									<section key={category.id} className="space-y-3">
										<div className="flex items-end justify-between gap-3">
											<div>
												<h3 className="text-lg font-bold text-white">{category.label}</h3>
										</div>
										</div>
										<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
											{rooms.map((room) => (
											<div key={room.room} className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-center transition hover:border-gray-500 hover:bg-gray-850">
												<div className="text-sm font-semibold tracking-wide text-white">{room.room}</div>
												</div>
											))}
										</div>
									</section>
								)
							})}
						</div>
					)}
				</section>
			</div>
		</div>
	)
}

export default EmptyClassroomFinder
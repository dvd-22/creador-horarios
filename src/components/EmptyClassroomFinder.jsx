import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, DoorOpen, Filter, ScanSearch } from 'lucide-react'

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

const minutesToLabel = (minutes) => {
	const hours = Math.floor(minutes / 60)
	const mins = String(minutes % 60).padStart(2, '0')
	return `${String(hours).padStart(2, '0')}:${mins}`
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
	const [selectedDays, setSelectedDays] = useState(dayOptions.map((day) => day.id))
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
			if (currentDays.includes(dayId)) {
				return currentDays.filter((day) => day !== dayId)
			}

			return [...currentDays, dayId]
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
								<div className="mt-1 text-2xl font-bold">{roomInventory.length}</div>
							</div>
							<div>
								<div className="text-xs uppercase tracking-[0.25em] text-gray-400">Disponibles</div>
								<div className="mt-1 text-2xl font-bold">{availableRooms.length}</div>
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

					<section className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
					<div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-xl font-bold text-white">Resultados</h2>
								<p className="mt-1 text-sm text-gray-300">
								{selectedDays.length > 0 ? `Días seleccionados: ${getDayLabels(selectedDays)}` : 'Selecciona al menos un día'}
							</p>
						</div>
							<div className="rounded-full border border-gray-600 bg-gray-700 px-4 py-2 text-sm text-gray-100">
							{availableRooms.length} salones libres
						</div>
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
						<div className="space-y-8 pt-5">
							{categoryOptions.map((category) => {
								const rooms = roomsByCategory[category.id] || []
								if (!selectedCategories.includes(category.id) || rooms.length === 0) return null

								return (
									<section key={category.id} className="space-y-3">
										<div className="flex items-end justify-between gap-3">
											<div>
												<h3 className="text-lg font-bold text-white">{category.label}</h3>
														<p className="text-sm text-gray-400">{rooms.length} salones disponibles</p>
											</div>
													<span className="rounded-full border border-gray-600 bg-gray-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-200">
												{category.id === 'others' ? 'Misceláneos' : `Tipo ${category.id}`}
											</span>
										</div>
										<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
											{rooms.map((room) => (
														<div key={room.room} className="rounded-lg border border-gray-700 bg-gray-900 p-4 transition hover:border-gray-500 hover:bg-gray-850">
													<div className="flex items-start justify-between gap-3">
														<div>
															<div className="text-lg font-bold text-white">{room.room}</div>
																	<div className="mt-1 text-sm text-gray-400">Libre en {getDayLabels(selectedDays)}</div>
														</div>
																<span className="rounded-full border border-gray-600 bg-gray-800 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-gray-200">
															{room.category === 'others' ? 'Otros' : room.category}
														</span>
													</div>
															<div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
																<span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
														Disponible para el rango buscado
													</div>
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
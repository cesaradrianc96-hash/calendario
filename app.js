const weekDayNames = [
  { short: "Lun", long: "Lunes" },
  { short: "Mar", long: "Martes" },
  { short: "Mié", long: "Miércoles" },
  { short: "Jue", long: "Jueves" },
  { short: "Vie", long: "Viernes" },
  { short: "Sáb", long: "Sábado" },
  { short: "Dom", long: "Domingo" }
];

const monthFormatter = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric"
});

const longDateFormatter = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
});

const timeFormatter = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit"
});

const STORAGE_KEY = "calendario-eventos";

const today = new Date();

const state = {
  currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
  selectedDate: null,
  events: loadEvents()
};

const calendarGrid = document.querySelector(".calendar__grid");
const weekDayContainer = document.querySelector(".calendar__weekdays");
const currentMonthLabel = document.getElementById("currentMonth");
const prevMonthButton = document.getElementById("prevMonth");
const nextMonthButton = document.getElementById("nextMonth");
const eventList = document.getElementById("eventList");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const eventForm = document.getElementById("eventForm");
const eventDateInput = document.getElementById("eventDate");

state.events.sort(compareEvents);

function loadEvents() {
  const fallbackEvents = [
    {
      title: "Inauguración de la temporada cultural",
      date: formatDateKey(new Date(today.getFullYear(), today.getMonth(), 3)),
      time: "18:30",
      location: "Centro cultural municipal",
      description: "Presentación de la programación anual y actuación musical en vivo."
    },
    {
      title: "Taller de fotografía urbana",
      date: formatDateKey(new Date(today.getFullYear(), today.getMonth(), 12)),
      time: "10:00",
      location: "Plaza Mayor",
      description: "Recorrido práctico por el casco histórico guiado por profesionales."
    },
    {
      title: "Mercado de productores locales",
      date: formatDateKey(new Date(today.getFullYear(), today.getMonth(), 18)),
      time: "09:30",
      location: "Parque del Río",
      description: "Alimentos frescos, artesanías y actividades infantiles."
    },
    {
      title: "Cine al aire libre: Clásicos del cine",
      date: formatDateKey(new Date(today.getFullYear(), today.getMonth(), 25)),
      time: "21:45",
      location: "Terraza del Museo",
      description: "Proyección gratuita. Lleva tu manta y mantén limpia el área."
    }
  ];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return fallbackEvents;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return fallbackEvents;
    }
    return parsed.filter(isValidEvent).map(normalizeEvent);
  } catch (error) {
    return fallbackEvents;
  }
}

function persistEvents() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  } catch (error) {
    // Ignorar errores de almacenamiento (modo incógnito, etc.)
  }
}

function normalizeEvent(event) {
  return {
    title: String(event.title).trim(),
    date: event.date,
    time: event.time ? String(event.time) : "",
    location: event.location ? String(event.location).trim() : "",
    description: event.description ? String(event.description).trim() : ""
  };
}

function isValidEvent(event) {
  return Boolean(event && event.title && event.date);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderWeekdays() {
  weekDayContainer.innerHTML = "";
  weekDayNames.forEach((day) => {
    const cell = document.createElement("span");
    cell.textContent = day.short;
    cell.title = day.long;
    weekDayContainer.appendChild(cell);
  });
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const monthDate = state.currentMonth;
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();

  currentMonthLabel.textContent = capitalizeFirst(
    monthFormatter.format(monthDate)
  );

  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // lunes como primer día
  const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalDaysPrevMonth = new Date(year, monthIndex, 0).getDate();
  const totalCells = 42; // 6 semanas

  for (let index = 0; index < totalCells; index += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar__day";
    cell.setAttribute("role", "gridcell");

    let dayNumber;
    let cellDate;
    let isCurrentMonth = false;

    if (index < startOffset) {
      dayNumber = totalDaysPrevMonth - startOffset + index + 1;
      cellDate = new Date(year, monthIndex - 1, dayNumber);
      cell.classList.add("is-outside");
      cell.disabled = true;
    } else if (index < startOffset + totalDaysInMonth) {
      dayNumber = index - startOffset + 1;
      cellDate = new Date(year, monthIndex, dayNumber);
      isCurrentMonth = true;
    } else {
      dayNumber = index - (startOffset + totalDaysInMonth) + 1;
      cellDate = new Date(year, monthIndex + 1, dayNumber);
      cell.classList.add("is-outside");
      cell.disabled = true;
    }

    const dateKey = formatDateKey(cellDate);

    const dateLabel = document.createElement("span");
    dateLabel.className = "calendar__date";
    dateLabel.textContent = String(dayNumber);
    cell.appendChild(dateLabel);

    const markers = document.createElement("div");
    markers.className = "calendar__markers";
    cell.appendChild(markers);

    const eventsForDay = getEventsForDate(dateKey);
    if (eventsForDay.length > 0) {
      eventsForDay.slice(0, 3).forEach(() => {
        const marker = document.createElement("span");
        marker.className = "calendar__marker";
        markers.appendChild(marker);
      });
      markers.setAttribute(
        "aria-label",
        `${eventsForDay.length} evento${eventsForDay.length > 1 ? "s" : ""}`
      );
    }

    if (isCurrentMonth) {
      cell.dataset.date = dateKey;

      const labelParts = [
        capitalizeFirst(longDateFormatter.format(cellDate))
      ];
      if (eventsForDay.length > 0) {
        labelParts.push(
          `${eventsForDay.length} evento${eventsForDay.length > 1 ? "s" : ""}`
        );
      }
      cell.setAttribute("aria-label", labelParts.join(". "));

      const isToday = dateKey === formatDateKey(today);
      if (isToday) {
        cell.classList.add("is-today");
        cell.setAttribute("aria-current", "date");
      }

      if (state.selectedDate === dateKey) {
        cell.classList.add("is-selected");
      }

      cell.addEventListener("click", () => {
        state.selectedDate = dateKey;
        renderCalendar();
        renderSelectedDate();
      });
    }

    calendarGrid.appendChild(cell);
  }
}

function getEventsForDate(dateKey) {
  return state.events
    .filter((event) => event.date === dateKey)
    .sort((eventA, eventB) => compareEvents(eventA, eventB));
}

function compareEvents(eventA, eventB) {
  const aTime = eventA.time ? `${eventA.date}T${eventA.time}` : `${eventA.date}T23:59`;
  const bTime = eventB.time ? `${eventB.date}T${eventB.time}` : `${eventB.date}T23:59`;
  return aTime.localeCompare(bTime);
}

function renderSelectedDate() {
  if (!state.selectedDate) {
    selectedDateLabel.textContent = "Selecciona un día";
    eventList.innerHTML = "";
    if (eventDateInput) {
      eventDateInput.value = formatDateKey(state.currentMonth);
    }
    return;
  }

  const [year, month, day] = state.selectedDate.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);

  selectedDateLabel.textContent = capitalizeFirst(
    longDateFormatter.format(selectedDate)
  );

  if (eventDateInput) {
    eventDateInput.value = state.selectedDate;
  }

  const eventsForDate = getEventsForDate(state.selectedDate);
  eventList.innerHTML = "";

  if (eventsForDate.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.textContent = "No hay eventos programados para este día.";
    emptyState.className = "event-card";
    eventList.appendChild(emptyState);
    return;
  }

  eventsForDate.forEach((event) => {
    const listItem = document.createElement("li");
    listItem.className = "event-card";

    const title = document.createElement("h3");
    title.textContent = event.title;
    listItem.appendChild(title);

    const time = document.createElement("time");
    time.dateTime = event.time ? `${event.date}T${event.time}` : event.date;
    time.textContent = event.time
      ? `⏰ ${timeFormatter.format(new Date(time.dateTime))}`
      : "⏰ Todo el día";
    listItem.appendChild(time);

    if (event.location) {
      const location = document.createElement("span");
      location.textContent = `📍 ${event.location}`;
      listItem.appendChild(location);
    }

    if (event.description) {
      const description = document.createElement("p");
      description.textContent = event.description;
      listItem.appendChild(description);
    }

    eventList.appendChild(listItem);
  });
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function goToPreviousMonth() {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() - 1,
    1
  );
  ensureSelectedDateInMonth();
  renderCalendar();
  renderSelectedDate();
}

function goToNextMonth() {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() + 1,
    1
  );
  ensureSelectedDateInMonth();
  renderCalendar();
  renderSelectedDate();
}

function ensureSelectedDateInMonth() {
  if (!state.selectedDate) {
    return;
  }
  const [year, month] = state.selectedDate.split("-").map(Number);
  const selectedMonth = new Date(year, month - 1, 1);
  if (
    selectedMonth.getFullYear() !== state.currentMonth.getFullYear() ||
    selectedMonth.getMonth() !== state.currentMonth.getMonth()
  ) {
    state.selectedDate = formatDateKey(state.currentMonth);
  }
}

function setupForm() {
  if (!eventForm) {
    return;
  }

  eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(eventForm);

    const newEvent = normalizeEvent({
      title: formData.get("title"),
      date: formData.get("date"),
      time: formData.get("time"),
      location: formData.get("location"),
      description: formData.get("description")
    });

    if (!newEvent.title || !newEvent.date) {
      return;
    }

    state.events.push(newEvent);
    state.events.sort(compareEvents);
    persistEvents();

    if (!state.selectedDate) {
      state.selectedDate = newEvent.date;
      state.currentMonth = new Date(
        Number(newEvent.date.slice(0, 4)),
        Number(newEvent.date.slice(5, 7)) - 1,
        1
      );
    }

    eventForm.reset();
    eventDateInput.value = newEvent.date;

    renderCalendar();
    renderSelectedDate();
  });
}

prevMonthButton.addEventListener("click", goToPreviousMonth);
nextMonthButton.addEventListener("click", goToNextMonth);

renderWeekdays();
if (!state.selectedDate) {
  state.selectedDate = formatDateKey(today);
}
renderCalendar();
renderSelectedDate();
setupForm();

eventDateInput.value = state.selectedDate;

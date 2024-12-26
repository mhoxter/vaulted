class ScheduleManager {
    constructor() {
        this.groups = JSON.parse(localStorage.getItem('groups')) || [];
        this.groups.forEach(group => {
            if (typeof group.startTime === 'string') {
                group.startTime = this.parseTime(group.startTime);
            }
            if (typeof group.endTime === 'string') {
                group.endTime = this.parseTime(group.endTime);
            }
        });
        this.events = JSON.parse(localStorage.getItem('events')) || [];
        this.sessions = JSON.parse(localStorage.getItem('sessions')) || [];
        this.savedSchedules = JSON.parse(localStorage.getItem('savedSchedules')) || {};
        this.colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        this.themes = {
            'default': {
                primary: '#2563eb',
                secondary: '#1d4ed8',
                background: '#f8fafc',
                text: '#1e293b',
                accent: '#dc2626'
            },
            'dark': {
                primary: '#475569',
                secondary: '#334155',
                background: '#0f172a',
                text: '#f8fafc',
                accent: '#ef4444'
            },
            'energetic': {
                primary: '#dc2626',
                secondary: '#b91c1c',
                background: '#fef2f2',
                text: '#1e293b',
                accent: '#eab308'
            },
            'nature': {
                primary: '#16a34a',
                secondary: '#15803d',
                background: '#f0fdf4',
                text: '#1e293b',
                accent: '#ea580c'
            },
            'calm': {
                primary: '#8b5cf6',
                secondary: '#7c3aed',
                background: '#f5f3ff',
                text: '#1e293b',
                accent: '#2563eb'
            }
        };
        this.currentTheme = localStorage.getItem('currentTheme') || 'default';
        this.headerText = localStorage.getItem('headerText') || '';
        this.headerImageUrl = localStorage.getItem('headerImageUrl') || '';

        this.initializeElements();
        this.bindEvents();
        this.refreshUI();
        this.applyTheme(this.currentTheme);
    }

    initializeElements() {
        this.startTimeInput = document.getElementById('startTime');
        this.endTimeInput = document.getElementById('endTime');
        this.timeIntervalSelect = document.getElementById('timeInterval');

        this.newGroupInput = document.getElementById('newGroupName');
        this.newEventInput = document.getElementById('newEventName');
        this.groupsList = document.getElementById('groupsList');
        this.eventsList = document.getElementById('eventsList');

        this.sessionGroupSelect = document.getElementById('sessionGroup');
        this.sessionEventSelect = document.getElementById('sessionEvent');
        this.sessionDurationInput = document.getElementById('sessionDuration');

        this.scheduleGrid = document.getElementById('scheduleGrid');
        this.newGroupStartTime = document.getElementById('newGroupStartTime');
        this.newGroupEndTime = document.getElementById('newGroupEndTime');
        this.headerTextInput = document.getElementById('headerText');
        this.headerImageUrlInput = document.getElementById('headerImageUrl');
    }

    bindEvents() {
        document.getElementById('addGroup').addEventListener('click', () => this.addGroup());
        document.getElementById('addEvent').addEventListener('click', () => this.addEvent());
        document.getElementById('createSession').addEventListener('click', () => this.createSession());

        document.getElementById('themeSelector').addEventListener('change', (e) => this.applyTheme(e.target.value));
        document.getElementById('saveSchedule').addEventListener('click', () =>
            this.saveCurrentSchedule(document.getElementById('scheduleNameInput').value));
        document.getElementById('saveAsSchedule').addEventListener('click', () =>
            this.saveCurrentSchedule(document.getElementById('scheduleNameInput').value, true));
        document.getElementById('loadScheduleSelect').addEventListener('change', (e) =>
            this.loadSchedule(e.target.value));

        [this.startTimeInput, this.endTimeInput, this.timeIntervalSelect].forEach(element => {
            element.addEventListener('change', () => this.refreshScheduleGrid());
        });

        document.getElementById('exportSchedule').addEventListener('click', () => this.exportSchedule());
        document.getElementById('importSchedule').addEventListener('change', (e) => this.importSchedule(e));
        this.headerTextInput.value = this.headerText;
        this.headerImageUrlInput.value = this.headerImageUrl;

        this.headerTextInput.addEventListener('input', () => {
            this.headerText = this.headerTextInput.value;
            localStorage.setItem('headerText', this.headerText);
            this.refreshUI();
        });

        this.headerImageUrlInput.addEventListener('input', () => {
            this.headerImageUrl = this.headerImageUrlInput.value;
            localStorage.setItem('headerImageUrl', this.headerImageUrl);
            this.refreshUI();
        });

        document.getElementById('downloadPdf').addEventListener('click', () => this.downloadPdf());
    }

    addGroup() {
        const name = this.newGroupInput.value.trim();
        const startTimeInput = document.getElementById('newGroupStartTime');
        const endTimeInput = document.getElementById('newGroupEndTime');

        if (!name || !startTimeInput.value || !endTimeInput.value) {
            alert('Please fill in all group details (name, start time, and end time)');
            return;
        }

        const startTime = this.parseTime(startTimeInput.value);
        const endTime = this.parseTime(endTimeInput.value);

        const globalStartTime = this.parseTime(this.startTimeInput.value);
        const globalEndTime = this.parseTime(this.endTimeInput.value);

        if (startTime < globalStartTime || endTime > globalEndTime) {
            alert(`Group times must be within the global schedule time (${this.formatTime(globalStartTime)} - ${this.formatTime(globalEndTime)})`);
            return;
        }

        if (startTime >= endTime) {
            alert('End time must be after start time');
            return;
        }

        this.groups.push({
            id: Date.now(),
            name,
            startTime,
            endTime
        });

        this.saveToLocalStorage();
        this.newGroupInput.value = '';
        startTimeInput.value = '';
        endTimeInput.value = '';
        this.refreshUI();
    }

    addEvent() {
        const name = this.newEventInput.value.trim();
        if (name) {
            this.events.push({ id: Date.now(), name });
            this.saveToLocalStorage();
            this.newEventInput.value = '';
            this.refreshUI();
        }
    }

    createSession() {
        const groupId = this.sessionGroupSelect.value;
        const eventId = this.sessionEventSelect.value;
        const duration = parseInt(this.sessionDurationInput.value);

        if (!groupId || !eventId || !duration) {
            alert('Please fill all session details');
            return;
        }

        const group = this.groups.find(g => g.id === parseInt(groupId));
        const event = this.events.find(e => e.id === parseInt(eventId));

        const timeSlot = this.findAvailableTimeSlot(eventId, groupId, duration);
        if (!timeSlot) {
            const endTime = this.parseTime(this.endTimeInput.value);
            const startTime = this.parseTime(this.startTimeInput.value);

            if (startTime + duration > endTime) {
                alert(`Session duration of ${duration} minutes exceeds remaining time in schedule`);
            } else {
                alert(`No available ${duration}-minute time slot found for ${group.name} at ${event.name}.\n\nPossible reasons:\n- Group is already scheduled at all possible times\n- Event location is fully booked\n\nTry a different time duration or check the schedule for conflicts.`);
            }
            return;
        }

        const session = {
            id: Date.now(),
            groupId: parseInt(groupId),
            eventId: parseInt(eventId),
            startTime: timeSlot,
            duration
        };

        this.sessions.push(session);
        this.saveToLocalStorage();
        this.refreshScheduleGrid();
    }

    findAvailableTimeSlot(eventId, groupId, duration) {
        const startTime = this.parseTime(this.startTimeInput.value);
        const endTime = this.parseTime(this.endTimeInput.value);
        const interval = parseInt(this.timeIntervalSelect.value);

        const group = this.groups.find(g => g.id === parseInt(groupId));
        if (!group) return null;

        // Use group's time restrictions instead of global schedule time
        const effectiveStartTime = Math.max(startTime, group.startTime);
        const effectiveEndTime = Math.min(endTime, group.endTime);

        // Check if the duration would exceed the group's end time
        if (duration > (effectiveEndTime - effectiveStartTime)) {
            return null;
        }

        for (let time = effectiveStartTime; time <= effectiveEndTime - duration; time += interval) {
            if (time + duration > effectiveEndTime) {
                continue;
            }

            const eventConflict = this.sessions.some(session => {
                if (session.eventId === parseInt(eventId)) {
                    const sessionStart = session.startTime;
                    const sessionEnd = sessionStart + session.duration;
                    return (time < sessionEnd && time + duration > sessionStart);
                }
                return false;
            });

            const groupConflict = this.sessions.some(session => {
                if (session.groupId === parseInt(groupId)) {
                    const sessionStart = session.startTime;
                    const sessionEnd = sessionStart + session.duration;
                    return (time < sessionEnd && time + duration > sessionStart);
                }
                return false;
            });

            if (!eventConflict && !groupConflict) {
                return time;
            }
        }

        return null;
    }

    handleDrop(e, time, eventId) {
        e.preventDefault();
        const session = JSON.parse(e.dataTransfer.getData('application/json'));
        const oldSession = this.sessions.find(s => s.id === session.id);
        const group = this.groups.find(g => g.id === oldSession.groupId);

        if (!oldSession || !group) return;

        if (time < group.startTime || time + oldSession.duration > group.endTime) {
            alert(`Cannot move session: Time slot is outside group's allowed hours (${this.formatTime(group.startTime)} - ${this.formatTime(group.endTime)})`);
            return;
        }

        this.sessions = this.sessions.filter(s => s.id !== session.id);

        const newSession = {
            ...oldSession,
            startTime: time,
            eventId: parseInt(eventId)
        };

        const conflict = this.sessions.some(s => {
            const sessionStart = s.startTime;
            const sessionEnd = sessionStart + s.duration;
            const newStart = newSession.startTime;
            const newEnd = newStart + newSession.duration;

            return (s.eventId === newSession.eventId || s.groupId === newSession.groupId) &&
                (newStart < sessionEnd && newEnd > sessionStart);
        });

        if (conflict) {
            const nextSlot = this.findAvailableTimeSlot(newSession.eventId, newSession.groupId, newSession.duration);
            if (nextSlot !== null) {
                newSession.startTime = nextSlot;
            } else {
                this.sessions.push(oldSession);
                alert('Cannot move session: No available time slots found within group\'s allowed hours');
                return;
            }
        }

        this.sessions.push(newSession);
        this.saveToLocalStorage();
        this.refreshScheduleGrid();
    }

    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    }

    refreshUI() {
        this.refreshLists();
        this.refreshSelects();
        this.refreshScheduleGrid();
    }

    refreshLists() {
        this.groupsList.innerHTML = this.groups.map(group => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    ${group.name}<br>
                    <small class="text-muted">${this.formatTime(group.startTime)} - ${this.formatTime(group.endTime)}</small>
                </div>
                <button class="btn btn-sm btn-danger" onclick="scheduleManager.deleteGroup(${group.id})">
                    <i data-feather="trash-2"></i>
                </button>
            </li>
        `).join('');

        this.eventsList.innerHTML = this.events.map(event => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${event.name}
                <button class="btn btn-sm btn-danger" onclick="scheduleManager.deleteEvent(${event.id})">
                    <i data-feather="trash-2"></i>
                </button>
            </li>
        `).join('');

        feather.replace();
    }

    refreshSelects() {
        this.sessionGroupSelect.innerHTML = '<option value="">Select Group</option>' +
            this.groups.map(group => `<option value="${group.id}">${group.name}</option>`).join('');

        this.sessionEventSelect.innerHTML = '<option value="">Select Event</option>' +
            this.events.map(event => `<option value="${event.id}">${event.name}</option>`).join('');
    }

    refreshScheduleGrid() {
        const startTime = this.parseTime(this.startTimeInput.value);
        const endTime = this.parseTime(this.endTimeInput.value);
        const interval = parseInt(this.timeIntervalSelect.value);

        const timeSlots = Math.ceil((endTime - startTime) / interval);
        this.scheduleGrid.style.gridTemplateColumns = `100px repeat(${this.events.length}, 1fr)`;

        // Remove existing header if any
        const existingHeader = document.querySelector('.schedule-header');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Add header if exists (before the grid)
        if (this.headerText || this.headerImageUrl) {
            const headerContainer = document.createElement('div');
            headerContainer.className = 'schedule-header mb-3';

            if (this.headerImageUrl) {
                const headerImage = document.createElement('img');
                headerImage.src = this.headerImageUrl;
                headerImage.alt = 'Schedule Header';
                headerImage.className = 'schedule-header-image';
                headerContainer.appendChild(headerImage);
            }

            if (this.headerText) {
                const headerTextDiv = document.createElement('h3');
                headerTextDiv.className = 'schedule-header-text';
                headerTextDiv.textContent = this.headerText;
                headerContainer.appendChild(headerTextDiv);
            }

            this.scheduleGrid.parentNode.insertBefore(headerContainer, this.scheduleGrid);
        }

        this.scheduleGrid.innerHTML = '';

        // Create the grid header
        const headerRow = document.createElement('div');
        headerRow.className = 'schedule-row';
        headerRow.style.display = 'contents';

        headerRow.appendChild(this.createCell('Time', 'event-header'));
        this.events.forEach(event => {
            headerRow.appendChild(this.createCell(event.name, 'event-header'));
        });
        this.scheduleGrid.appendChild(headerRow);

        // Create time slots and sessions
        for (let time = startTime; time < endTime; time += interval) {
            const row = document.createElement('div');
            row.className = 'schedule-row';
            row.style.display = 'contents';

            row.appendChild(this.createCell(this.formatTime(time), 'time-label'));

            this.events.forEach(event => {
                const cell = this.createCell('', 'time-slot');
                cell.addEventListener('dragover', (e) => e.preventDefault());
                cell.addEventListener('drop', (e) => this.handleDrop(e, time, event.id));

                const sessions = this.sessions.filter(s =>
                    s.eventId === event.id &&
                    s.startTime === time
                );

                sessions.forEach(session => {
                    const group = this.groups.find(g => g.id === session.groupId);
                    const sessionElement = document.createElement('div');
                    sessionElement.className = 'session-block';
                    sessionElement.draggable = true;
                    sessionElement.dataset.sessionId = session.id;

                    const durationSlots = session.duration / interval;
                    sessionElement.style.setProperty('--duration-slots', durationSlots);
                    sessionElement.style.backgroundColor = this.colors[this.groups.indexOf(group) % this.colors.length];

                    sessionElement.addEventListener('dragstart', (e) => this.handleDragStart(e, session));
                    sessionElement.addEventListener('dragend', (e) => this.handleDragEnd(e));

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = `${group.name}\n${this.formatTime(session.startTime)} - ${this.formatTime(session.startTime + session.duration)}`;
                    nameSpan.style.whiteSpace = 'pre-line';
                    sessionElement.appendChild(nameSpan);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'session-delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.deleteSession(session.id);
                    };
                    sessionElement.appendChild(deleteBtn);

                    cell.appendChild(sessionElement);
                });
                row.appendChild(cell);
            });

            this.scheduleGrid.appendChild(row);
        }
    }

    handleDragStart(e, session) {
        e.dataTransfer.setData('application/json', JSON.stringify(session));
        e.target.style.opacity = '0.5';
    }

    handleDragEnd(e) {
        e.target.style.opacity = '1';
    }


    createCell(content, className) {
        const cell = document.createElement('div');
        cell.className = className;
        cell.textContent = content;
        return cell;
    }

    deleteGroup(id) {
        this.groups = this.groups.filter(g => g.id !== id);
        this.sessions = this.sessions.filter(s => s.groupId !== id);
        this.saveToLocalStorage();
        this.refreshUI();
    }

    deleteEvent(id) {
        this.events = this.events.filter(e => e.id !== id);
        this.sessions = this.sessions.filter(s => s.eventId !== id);
        this.saveToLocalStorage();
        this.refreshUI();
    }

    deleteSession(id) {
        this.sessions = this.sessions.filter(s => s.id !== id);
        this.saveToLocalStorage();
        this.refreshScheduleGrid();
    }

    saveToLocalStorage() {
        localStorage.setItem('groups', JSON.stringify(this.groups));
        localStorage.setItem('events', JSON.stringify(this.events));
        localStorage.setItem('sessions', JSON.stringify(this.sessions));
        localStorage.setItem('savedSchedules', JSON.stringify(this.savedSchedules));
        localStorage.setItem('currentTheme', this.currentTheme);
        localStorage.setItem('headerText', this.headerText);
        localStorage.setItem('headerImageUrl', this.headerImageUrl);
    }

    applyTheme(themeName) {
        const theme = this.themes[themeName];
        document.documentElement.style.setProperty('--primary-color', theme.primary);
        document.documentElement.style.setProperty('--secondary-color', theme.secondary);
        document.documentElement.style.setProperty('--background-color', theme.background);
        document.documentElement.style.setProperty('--text-color', theme.text);
        document.documentElement.style.setProperty('--accent-color', theme.accent);
        this.currentTheme = themeName;
        this.saveToLocalStorage();
    }

    saveCurrentSchedule(name, saveAs = false) {
        if (!name) {
            alert('Please enter a schedule name');
            return;
        }

        if (!saveAs && this.savedSchedules[name]) {
            if (!confirm(`Schedule "${name}" already exists. Do you want to overwrite it?`)) {
                return;
            }
        }

        this.savedSchedules[name] = {
            groups: this.groups,
            events: this.events,
            sessions: this.sessions,
            timestamp: new Date().toISOString()
        };

        this.saveToLocalStorage();
        this.refreshScheduleSelect();
    }

    loadSchedule(name) {
        if (!name) return;

        const schedule = this.savedSchedules[name];
        if (!schedule) {
            alert('Schedule not found');
            return;
        }

        if (this.groups.length > 0 || this.events.length > 0 || this.sessions.length > 0) {
            if (!confirm('Loading a new schedule will replace the current one. Continue?')) {
                return;
            }
        }

        this.groups = [...schedule.groups];
        this.events = [...schedule.events];
        this.sessions = [...schedule.sessions];
        this.saveToLocalStorage();
        this.refreshUI();
    }

    refreshScheduleSelect() {
        const select = document.getElementById('loadScheduleSelect');
        select.innerHTML = '<option value="">Load Schedule...</option>';

        Object.entries(this.savedSchedules)
            .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
            .forEach(([name, schedule]) => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = `${name} (${new Date(schedule.timestamp).toLocaleDateString()})`;
                select.appendChild(option);
            });
    }

    exportSchedule() {
        const currentSchedule = {
            groups: this.groups,
            events: this.events,
            sessions: this.sessions,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(currentSchedule, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = `schedule_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
    }

    importSchedule(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (!this.validateImportedSchedule(importedData)) {
                    alert('Invalid schedule file format');
                    return;
                }

                if (this.groups.length > 0 || this.events.length > 0 || this.sessions.length > 0) {
                    if (!confirm('Importing will replace your current schedule. Continue?')) {
                        event.target.value = '';
                        return;
                    }
                }

                this.groups = importedData.groups;
                this.events = importedData.events;
                this.sessions = importedData.sessions;
                this.saveToLocalStorage();
                this.refreshUI();

                alert('Schedule imported successfully');
            } catch (error) {
                console.error('Import error:', error);
                alert('Error importing schedule: Invalid file format');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    validateImportedSchedule(data) {
        if (!Array.isArray(data.groups) || !Array.isArray(data.events) || !Array.isArray(data.sessions)) {
            return false;
        }

        if (!data.groups.every(group =>
            typeof group === 'object' &&
            typeof group.id === 'number' &&
            typeof group.name === 'string' &&
            typeof group.startTime === 'number' &&
            typeof group.endTime === 'number'
        )) {
            return false;
        }

        if (!data.events.every(event =>
            typeof event === 'object' &&
            typeof event.id === 'number' &&
            typeof event.name === 'string'
        )) {
            return false;
        }

        if (!data.sessions.every(session =>
            typeof session === 'object' &&
            typeof session.id === 'number' &&
            typeof session.groupId === 'number' &&
            typeof session.eventId === 'number' &&
            typeof session.startTime === 'number' &&
            typeof session.duration === 'number'
        )) {
            return false;
        }

        return true;
    }

    async downloadPdf() {
        const scheduleData = {
            headerText: this.headerText,
            headerImageUrl: this.headerImageUrl,
            groups: this.groups,
            events: this.events,
            sessions: this.sessions,
            startTime: this.startTimeInput.value,
            endTime: this.endTimeInput.value,
            interval: this.timeIntervalSelect.value
        };

        try {
            const orientationButtons = document.querySelectorAll('.orientation-btn');
            orientationButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    const orientation = button.dataset.orientation;
                    scheduleData.orientation = orientation;

                    const modal = document.getElementById('pdfOrientationModal');
                    const bootstrapModal = bootstrap.Modal.getInstance(modal);
                    bootstrapModal.hide();

                    const response = await fetch('/download-pdf', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(scheduleData)
                    });

                    if (!response.ok) throw new Error('PDF generation failed');

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `schedule_${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                });
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    }
}

const scheduleManager = new ScheduleManager();
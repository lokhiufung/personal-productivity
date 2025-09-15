// Data structure
let currentTasks = JSON.parse(localStorage.getItem('currentTasks')) || [];
let weeklyHistory = JSON.parse(localStorage.getItem('weeklyHistory')) || [];
let goals = JSON.parse(localStorage.getItem('goals')) || [];

// Graph variables
let svg, simulation, zoomBehavior, mainGroup;
let currentZoom = 1;
const minZoom = 0.1;
const maxZoom = 5;

// Initialize the app
function init() {
    // Migrate existing tasks to include new properties
    currentTasks = currentTasks.map(task => ({
        ...task,
        priority: task.priority || 'medium',
        dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : 
                    (task.dependsOn ? [task.dependsOn] : []),
        goalId: task.goalId || null
    }));
    saveCurrentTasks();
    
    renderTasks();
    renderHistory();
    renderGoals();
    updateStats();
    loadCurrentSummary();
    initializeGraph();
}

// Goals management
function showGoalForm() {
    document.getElementById('goalForm').style.display = 'block';
    document.getElementById('goalFormTitle').focus();
}

function hideGoalForm() {
    document.getElementById('goalForm').style.display = 'none';
    document.getElementById('goalFormTitle').value = '';
    document.getElementById('goalFormDescription').value = '';
    document.getElementById('goalFormDeadline').value = '';
    document.getElementById('goalFormPriority').value = 'medium';
}

function addGoal() {
    const title = document.getElementById('goalFormTitle').value.trim();
    const description = document.getElementById('goalFormDescription').value.trim();
    const deadline = document.getElementById('goalFormDeadline').value;
    const priority = document.getElementById('goalFormPriority').value;
    
    if (title === '') {
        alert('Please enter a goal title');
        return;
    }
    
    const goal = {
        id: Date.now(),
        title: title,
        description: description,
        deadline: deadline || null,
        priority: priority,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
    };
    
    goals.push(goal);
    saveGoals();
    renderGoals();
    updateTaskGoalOptions();
    hideGoalForm();
    
    showCelebration('Goal created! 🎯 Time to break it down into actionable tasks!');
}

function toggleGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
        goal.completed = !goal.completed;
        goal.completedAt = goal.completed ? new Date().toISOString() : null;
        
        if (goal.completed) {
            showCelebration(`🎉 AMAZING! Goal "${goal.title}" completed! You're unstoppable! 🚀`);
        }
        
        saveGoals();
        renderGoals();
        updateStats();
    }
}

function deleteGoal(goalId) {
    // Check if any tasks are linked to this goal
    const linkedTasks = currentTasks.filter(t => t.goalId === goalId);
    
    if (linkedTasks.length > 0) {
        const taskNames = linkedTasks.map(t => `"${t.text}"`).join(', ');
        if (!confirm(`${linkedTasks.length} tasks are linked to this goal: ${taskNames}. Delete anyway? (Task links will be removed)`)) {
            return;
        }
        // Remove goal link from tasks
        linkedTasks.forEach(t => {
            t.goalId = null;
        });
        saveCurrentTasks();
        renderTasks();
    }
    
    if (confirm('Are you sure you want to delete this goal?')) {
        goals = goals.filter(g => g.id !== goalId);
        saveGoals();
        renderGoals();
        updateTaskGoalOptions();
        updateStats();
    }
}

function editGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
        const newTitle = prompt('Edit goal title:', goal.title);
        if (newTitle !== null && newTitle.trim() !== '') {
            goal.title = newTitle.trim();
            saveGoals();
            renderGoals();
            updateTaskGoalOptions();
            renderTasks();
            showCelebration('Goal updated! ✏️');
        }
    }
}

function renderGoals() {
    const goalsList = document.getElementById('goalsList');
    
    if (goals.length === 0) {
        goalsList.innerHTML = '<div class="empty-state">No goals yet. Set your first goal to stay focused! 🎯</div>';
        return;
    }
    
    // Sort goals: incomplete first, then by priority, then by deadline
    const sortedGoals = [...goals].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
            return bPriority - aPriority;
        }
        
        // Sort by deadline (earlier deadlines first)
        if (a.deadline && b.deadline) {
            return new Date(a.deadline) - new Date(b.deadline);
        } else if (a.deadline) {
            return -1;
        } else if (b.deadline) {
            return 1;
        }
        
        return 0;
    });
    
    goalsList.innerHTML = sortedGoals.map(goal => {
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
        const linkedTasks = currentTasks.filter(t => t.goalId === goal.id);
        const completedLinkedTasks = linkedTasks.filter(t => t.completed);
        
        // Calculate progress
        const progress = linkedTasks.length > 0 ? 
            Math.round((completedLinkedTasks.length / linkedTasks.length) * 100) : 0;
        
        // Deadline formatting
        let deadlineText = '';
        if (goal.deadline) {
            const deadline = new Date(goal.deadline);
            const now = new Date();
            const diffTime = deadline - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                deadlineText = `<span class="goal-overdue">⚠️ ${Math.abs(diffDays)} days overdue</span>`;
            } else if (diffDays === 0) {
                deadlineText = `<span class="goal-today">🔥 Due today!</span>`;
            } else if (diffDays <= 7) {
                deadlineText = `<span class="goal-urgent">⏰ ${diffDays} days left</span>`;
            } else {
                deadlineText = `<span class="goal-deadline">📅 ${diffDays} days left</span>`;
            }
        }
        
        return `
            <div class="goal-item ${goal.completed ? 'completed' : ''}" data-goal-id="${goal.id}">
                <div class="goal-main-content">
                    <input type="checkbox" class="goal-checkbox" ${goal.completed ? 'checked' : ''}>
                    <div class="goal-details">
                        <div class="goal-title">${goal.title}</div>
                        ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
                        <div class="goal-meta">
                            <span class="goal-priority ${goal.priority}">${priorityEmoji[goal.priority]} ${goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}</span>
                            ${deadlineText}
                            ${linkedTasks.length > 0 ? `<span class="goal-progress">📊 ${progress}% (${completedLinkedTasks.length}/${linkedTasks.length} tasks)</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="goal-actions">
                    <button class="goal-edit-btn">Edit</button>
                    <button class="goal-delete-btn">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Task management with multiple dependencies and goals
let selectedDependencies = [];

function showTaskForm() {
    const simpleInput = document.getElementById('taskInput');
    const taskForm = document.getElementById('taskForm');
    const formInput = document.getElementById('taskFormInput');
    
    // Reset dependencies
    selectedDependencies = [];
    
    // Copy text from simple input if any
    formInput.value = simpleInput.value;
    simpleInput.value = '';
    
    // Update dependency dropdown and display
    updateDependencySelect();
    updateTaskGoalOptions();
    renderSelectedDependencies();
    
    taskForm.style.display = 'block';
    formInput.focus();
}

function hideTaskForm() {
    document.getElementById('taskForm').style.display = 'none';
    document.getElementById('taskFormInput').value = '';
    document.getElementById('dependsOn').value = '';
    document.getElementById('priority').value = 'medium';
    document.getElementById('taskGoal').value = '';
    selectedDependencies = [];
    renderSelectedDependencies();
}

function updateTaskGoalOptions() {
    const select = document.getElementById('taskGoal');
    const incompleteGoals = goals.filter(g => !g.completed);
    
    // Clear existing options except first one
    select.innerHTML = '<option value="">No specific goal</option>';
    
    // Add incomplete goals as options
    incompleteGoals.forEach(goal => {
        const option = document.createElement('option');
        option.value = goal.id;
        option.textContent = goal.title.length > 40 ? goal.title.substring(0, 40) + '...' : goal.title;
        select.appendChild(option);
    });
}

function updateDependencySelect() {
    const select = document.getElementById('dependsOn');
    const incompleteTasks = currentTasks.filter(t => !t.completed && !selectedDependencies.includes(t.id));
    
    // Clear existing options except first one
    select.innerHTML = '<option value="">Select a task to add as dependency</option>';
    
    // Add incomplete tasks as options (excluding already selected ones)
    incompleteTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.text.length > 50 ? task.text.substring(0, 50) + '...' : task.text;
        select.appendChild(option);
    });
    
    // Disable if no more tasks available
    select.disabled = incompleteTasks.length === 0;
    if (incompleteTasks.length === 0) {
        select.innerHTML = '<option value="">No more tasks available</option>';
    }
}

function renderSelectedDependencies() {
    const container = document.getElementById('selectedDependencies');
    
    if (selectedDependencies.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = selectedDependencies.map(depId => {
        const task = currentTasks.find(t => t.id === depId);
        if (!task) return '';
        
        const displayText = task.text.length > 30 ? task.text.substring(0, 30) + '...' : task.text;
        return `
            <div class="dependency-tag">
                <span>${displayText}</span>
                <button class="dependency-remove" onclick="removeDependency(${depId})" type="button">×</button>
            </div>
        `;
    }).join('');
}

function addDependency() {
    const select = document.getElementById('dependsOn');
    const selectedId = parseInt(select.value);
    
    if (selectedId && !selectedDependencies.includes(selectedId)) {
        selectedDependencies.push(selectedId);
        renderSelectedDependencies();
        updateDependencySelect();
        select.value = '';
    }
}

function removeDependency(depId) {
    selectedDependencies = selectedDependencies.filter(id => id !== depId);
    renderSelectedDependencies();
    updateDependencySelect();
}

function addTask() {
    const input = document.getElementById('taskInput');
    const taskText = input.value.trim();
    
    if (taskText === '') return;
    
    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        dependsOn: [],
        priority: 'medium',
        goalId: null
    };
    
    currentTasks.push(task);
    saveCurrentTasks();
    renderTasks();
    updateStats();
    refreshGraph();
    input.value = '';
}

function addTaskWithDependency() {
    const taskText = document.getElementById('taskFormInput').value.trim();
    const priority = document.getElementById('priority').value;
    const goalId = document.getElementById('taskGoal').value || null;
    
    if (taskText === '') {
        alert('Please enter a task description');
        return;
    }
    
    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        dependsOn: selectedDependencies.length > 0 ? [...selectedDependencies] : [],
        priority: priority,
        goalId: goalId ? parseInt(goalId) : null
    };
    
    currentTasks.push(task);
    saveCurrentTasks();
    renderTasks();
    renderGoals(); // Update goals to show new progress
    updateStats();
    refreshGraph();
    hideTaskForm();
    
    const depCount = selectedDependencies.length;
    const goalText = goalId ? ' linked to your goal' : '';
    const message = depCount > 0 ? 
        `Task created with ${depCount} dependencies${goalText}! 📋🔗` : 
        `Task created${goalText}! 📋`;
    showCelebration(message);
}

function toggleTask(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (task) {
        // Check if task can be completed (no blocking dependencies)
        if (!task.completed && task.dependsOn && task.dependsOn.length > 0) {
            const incompleteDeps = task.dependsOn
                .map(depId => currentTasks.find(t => t.id === depId))
                .filter(dep => dep && !dep.completed);
            
            if (incompleteDeps.length > 0) {
                const depNames = incompleteDeps.map(dep => `"${dep.text}"`).join(', ');
                alert(`Cannot complete this task yet. Please complete these dependencies first: ${depNames}`);
                return;
            }
        }
        
        task.completed = !task.completed;
        if (task.completed) {
            showCelebration();
        }
        saveCurrentTasks();
        renderTasks();
        renderGoals(); // Update goals progress
        updateStats();
        refreshGraph();
    }
}

function deleteTask(taskId) {
    // Check if other tasks depend on this one
    const dependentTasks = currentTasks.filter(t => 
        t.dependsOn && t.dependsOn.includes(taskId)
    );
    
    if (dependentTasks.length > 0) {
        const dependentNames = dependentTasks.map(t => `"${t.text}"`).join(', ');
        if (!confirm(`Other tasks depend on this one: ${dependentNames}. Delete anyway? (Dependencies will be removed)`)) {
            return;
        }
        // Remove this task from all dependsOn arrays
        dependentTasks.forEach(t => {
            t.dependsOn = t.dependsOn.filter(depId => depId !== taskId);
        });
    }
    
    if (confirm('Are you sure you want to delete this task?')) {
        currentTasks = currentTasks.filter(t => t.id !== taskId);
        saveCurrentTasks();
        renderTasks();
        renderGoals(); // Update goals progress
        updateStats();
        refreshGraph();
    }
}

function editTask(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (task) {
        const newText = prompt('Edit task:', task.text);
        if (newText !== null && newText.trim() !== '') {
            task.text = newText.trim();
            saveCurrentTasks();
            renderTasks();
            refreshGraph();
            showCelebration('Task updated! ✏️');
        }
    }
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    
    if (currentTasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">No tasks yet. Add your first task above! 💪</div>';
        return;
    }
    
    // Sort tasks: high priority first, then by dependencies
    const sortedTasks = [...currentTasks].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = a.priority || 'medium';
        const bPriority = b.priority || 'medium';
        return priorityOrder[bPriority] - priorityOrder[aPriority];
    });
    
    taskList.innerHTML = sortedTasks.map(task => {
        // Ensure task has all required properties
        const priority = task.priority || 'medium';
        const dependencies = Array.isArray(task.dependsOn) ? task.dependsOn : (task.dependsOn ? [task.dependsOn] : []);
        const goalId = task.goalId;
        
        // Find incomplete dependencies
        const incompleteDeps = dependencies
            .map(depId => currentTasks.find(t => t.id === depId))
            .filter(dep => dep && !dep.completed);
        
        const isBlocked = incompleteDeps.length > 0;
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
        
        // Find linked goal
        const linkedGoal = goalId ? goals.find(g => g.id === goalId) : null;
        
        // Create dependency text
        let dependencyText = '';
        if (dependencies.length > 0) {
            const depTasks = dependencies
                .map(depId => currentTasks.find(t => t.id === depId))
                .filter(dep => dep);
            
            if (depTasks.length === 1) {
                dependencyText = `⏳ Waiting for: "${depTasks[0].text}"`;
            } else if (depTasks.length > 1) {
                dependencyText = `⏳ Waiting for ${depTasks.length} tasks: ${depTasks.map(d => `"${d.text}"`).join(', ')}`;
            }
        }
        
        return `
            <li class="task-item ${task.completed ? 'completed' : ''} ${isBlocked ? 'task-blocked' : ''}" data-task-id="${task.id}">
                <div class="task-main-content">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} ${isBlocked ? 'disabled' : ''}>
                    <div class="task-details">
                        <div class="task-text">${task.text}</div>
                        <div class="task-meta">
                            <span class="task-priority ${priority}">${priorityEmoji[priority]} ${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
                            ${linkedGoal ? `<span class="task-goal">🎯 ${linkedGoal.title}</span>` : ''}
                            ${dependencyText ? `<span class="task-dependency">${dependencyText}</span>` : ''}
                            ${isBlocked ? '<span style="color: #f59e0b;">🚫 Blocked</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-edit-btn">Edit</button>
                    <button class="task-delete-btn">Delete</button>
                </div>
            </li>
        `;
    }).join('');
}

// Event delegation for task and goal actions
document.addEventListener('DOMContentLoaded', function() {
    const taskList = document.getElementById('taskList');
    const historyList = document.getElementById('historyList');
    const goalsList = document.getElementById('goalsList');
    
    // Task list event delegation
    taskList.addEventListener('click', function(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = parseInt(taskItem.dataset.taskId);
        
        if (e.target.classList.contains('task-edit-btn')) {
            editTask(taskId);
        } else if (e.target.classList.contains('task-delete-btn')) {
            deleteTask(taskId);
        }
    });
    
    taskList.addEventListener('change', function(e) {
        if (e.target.classList.contains('task-checkbox')) {
            const taskItem = e.target.closest('.task-item');
            const taskId = parseInt(taskItem.dataset.taskId);
            toggleTask(taskId);
        }
    });
    
    // Goals list event delegation
    goalsList.addEventListener('click', function(e) {
        const goalItem = e.target.closest('.goal-item');
        if (!goalItem) return;
        
        const goalId = parseInt(goalItem.dataset.goalId);
        
        if (e.target.classList.contains('goal-edit-btn')) {
            editGoal(goalId);
        } else if (e.target.classList.contains('goal-delete-btn')) {
            deleteGoal(goalId);
        }
    });
    
    goalsList.addEventListener('change', function(e) {
        if (e.target.classList.contains('goal-checkbox')) {
            const goalItem = e.target.closest('.goal-item');
            const goalId = parseInt(goalItem.dataset.goalId);
            toggleGoal(goalId);
        }
    });
    
    // Dependency select event delegation
    const dependsOnSelect = document.getElementById('dependsOn');
    if (dependsOnSelect) {
        dependsOnSelect.addEventListener('change', function() {
            if (this.value) {
                addDependency();
            }
        });
    }
    
    historyList.addEventListener('click', function(e) {
        const weekEntry = e.target.closest('.week-entry');
        if (!weekEntry) return;
        
        const weekId = parseInt(weekEntry.dataset.weekId);
        
        if (e.target.classList.contains('week-edit-btn')) {
            editWeek(weekId);
        } else if (e.target.classList.contains('week-delete-btn')) {
            deleteWeek(weekId);
        }
    });
});

// Weekly summary functions
function saveWeeklySummary() {
    const summaryText = document.getElementById('weeklySummary').value.trim();
    
    if (summaryText === '' && currentTasks.length === 0) {
        alert('Add some tasks or write a summary before saving the week!');
        return;
    }
    
    const weekData = {
        id: Date.now(),
        weekOf: new Date().toISOString().split('T')[0],
        summary: summaryText,
        tasks: [...currentTasks],
        goals: [...goals],
        completedCount: currentTasks.filter(t => t.completed).length,
        totalCount: currentTasks.length,
        goalsCompletedCount: goals.filter(g => g.completed).length,
        totalGoalsCount: goals.length
    };
    
    weeklyHistory.unshift(weekData);
    localStorage.setItem('weeklyHistory', JSON.stringify(weeklyHistory));
    
    renderHistory();
    updateStats();
    
    showCelebration('Week saved! 🎉 Great progress this week!');
}

function clearWeek() {
    if (currentTasks.length > 0 || document.getElementById('weeklySummary').value.trim() !== '') {
        if (!confirm('This will clear your current summary and remove all completed tasks. Incomplete tasks will be carried over. Are you sure?')) {
            return;
        }
    }
    
    // Remove completed tasks and keep only unfinished tasks for the new week
    const unfinishedTasks = currentTasks.filter(task => !task.completed);
    
    // Clean up dependencies - remove any dependencies that reference completed/removed tasks
    const unfinishedTaskIds = new Set(unfinishedTasks.map(t => t.id));
    unfinishedTasks.forEach(task => {
        if (task.dependsOn && task.dependsOn.length > 0) {
            task.dependsOn = task.dependsOn.filter(depId => unfinishedTaskIds.has(depId));
        }
    });
    
    currentTasks = unfinishedTasks;
    document.getElementById('weeklySummary').value = '';
    saveCurrentTasks();
    localStorage.removeItem('currentSummary');
    renderTasks();
    renderGoals(); // Update goals progress
    updateStats();
    refreshGraph();
    
    const removedCount = currentTasks.length > 0 ? 
        `${currentTasks.length} unfinished tasks carried over.` : 
        'All tasks completed!';
    
    showCelebration(`Fresh start! Completed tasks removed. ${removedCount} Ready for another productive week! 💪`);
}

function loadCurrentSummary() {
    const savedSummary = localStorage.getItem('currentSummary') || '';
    document.getElementById('weeklySummary').value = savedSummary;
}

// Auto-save summary as user types
document.getElementById('weeklySummary').addEventListener('input', function() {
    localStorage.setItem('currentSummary', this.value);
});

// History rendering
function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    if (weeklyHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No history yet. Complete your first week to see your progress! 📈</div>';
        return;
    }
    
    historyList.innerHTML = weeklyHistory.map(week => {
        const weekDate = new Date(week.weekOf);
        const dateString = weekDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        // Handle legacy data that might not have goals info
        const goalsText = week.totalGoalsCount !== undefined ? 
            `<div class="week-goals-stats">Goals: ${week.goalsCompletedCount || 0} of ${week.totalGoalsCount || 0} completed</div>` : '';
        
        return `
            <div class="week-entry" id="week-${week.id}" data-week-id="${week.id}">
                <div class="week-actions">
                    <button class="week-edit-btn">Edit</button>
                    <button class="week-delete-btn">Delete</button>
                </div>
                <div class="week-header">Week of ${dateString}</div>
                <div class="week-stats">
                    Completed ${week.completedCount} of ${week.totalCount} tasks 
                    ${week.totalCount > 0 ? `(${Math.round((week.completedCount / week.totalCount) * 100)}%)` : ''}
                </div>
                ${goalsText}
                ${week.summary ? `<div class="week-summary" id="summary-${week.id}">"${week.summary}"</div>` : ''}
            </div>
        `;
    }).join('');
}

// Week history editing
function editWeek(weekId) {
    const week = weeklyHistory.find(w => w.id === weekId);
    if (!week) return;
    
    const weekElement = document.getElementById(`week-${weekId}`);
    
    // Check if already editing - prevent duplicates
    if (weekElement.querySelector('.week-edit-form')) {
        return;
    }
    
    const summaryElement = document.getElementById(`summary-${weekId}`);
    
    // Create edit form
    const editForm = document.createElement('div');
    editForm.className = 'week-edit-form';
    editForm.innerHTML = `
        <textarea class="week-edit-textarea" id="edit-textarea-${weekId}">${week.summary || ''}</textarea>
        <div class="week-edit-actions">
            <button class="btn btn-small" onclick="saveWeekEdit(${weekId})">Save</button>
            <button class="btn btn-secondary btn-small" onclick="cancelWeekEdit(${weekId})">Cancel</button>
        </div>
    `;
    
    // Hide original summary and add edit form
    if (summaryElement) {
        summaryElement.style.display = 'none';
    }
    weekElement.appendChild(editForm);
    
    // Focus on textarea
    document.getElementById(`edit-textarea-${weekId}`).focus();
}

function saveWeekEdit(weekId) {
    const week = weeklyHistory.find(w => w.id === weekId);
    const textarea = document.getElementById(`edit-textarea-${weekId}`);
    if (!textarea) return;
    
    const newSummary = textarea.value.trim();
    
    week.summary = newSummary;
    localStorage.setItem('weeklyHistory', JSON.stringify(weeklyHistory));
    
    renderHistory();
    showCelebration('Week updated! ✏️');
}

function cancelWeekEdit(weekId) {
    renderHistory(); // This will remove the edit form and restore original
}

function deleteWeek(weekId) {
    if (confirm('Are you sure you want to delete this week? This cannot be undone.')) {
        weeklyHistory = weeklyHistory.filter(w => w.id !== weekId);
        localStorage.setItem('weeklyHistory', JSON.stringify(weeklyHistory));
        renderHistory();
        updateStats();
        showCelebration('Week deleted.');
    }
}

// Statistics
function updateStats() {
    const completedThisWeek = currentTasks.filter(t => t.completed).length;
    const totalThisWeek = currentTasks.length;
    const completionRate = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;
    
    const completedGoals = goals.filter(g => g.completed).length;
    const totalGoals = goals.length;
    
    document.getElementById('tasksCompleted').textContent = completedThisWeek;
    document.getElementById('totalTasks').textContent = totalThisWeek;
    document.getElementById('weeksTracked').textContent = weeklyHistory.length;
    document.getElementById('completionRate').textContent = completionRate + '%';
    document.getElementById('goalsCompleted').textContent = completedGoals;
    document.getElementById('totalGoals').textContent = totalGoals;
}

// Celebration
function showCelebration(message = 'Great job completing that task! 🎉') {
    const celebration = document.getElementById('celebration');
    celebration.innerHTML = `<div class="celebration">${message}</div>`;
    celebration.style.display = 'block';
    
    setTimeout(() => {
        celebration.style.display = 'none';
    }, 3000);
}

// Generate AI summary using Ollama
async function generateAISummary() {
    const completedTasks = currentTasks.filter(t => t.completed);
    
    if (completedTasks.length === 0) {
        alert('No completed tasks this week to summarize!');
        return;
    }
    
    const generateBtn = document.querySelector('button[onclick="generateAISummary()"]');
    const originalText = generateBtn.textContent;
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;
    
    try {
        const taskList = completedTasks.map(task => {
            const goal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
            const goalText = goal ? ` (contributes to goal: "${goal.title}")` : '';
            return `• ${task.text}${goalText}`;
        }).join('\n');
        
        const completedGoals = goals.filter(g => g.completed);
        const goalsText = completedGoals.length > 0 ? 
            `\n\nCompleted Goals:\n${completedGoals.map(g => `• ${g.title}`).join('\n')}` : '';
        
        const prompt = `You are helping someone track their progress in building an algorithmic trading business. They completed these tasks this week:

${taskList}${goalsText}

Please write a short, encouraging weekly summary (2-3 sentences) that:
1. Acknowledges their specific accomplishments
2. Highlights the progress they're making toward their algorithmic trading goals
3. Provides positive reinforcement to keep them motivated

Focus on being supportive and recognizing the value of their consistent effort, even if the final goal still seems distant.`;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'granite3.3:2b',  // You can change this to your preferred model
                prompt: prompt,
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }
        
        const data = await response.json();
        const aiSummary = data.response.trim();
        
        // Add AI summary to the textarea
        const summaryTextarea = document.getElementById('weeklySummary');
        const currentContent = summaryTextarea.value.trim();
        const newContent = currentContent ? 
            `${currentContent}\n\nAI Reflection:\n${aiSummary}` : 
            `AI Reflection:\n${aiSummary}`;
        
        summaryTextarea.value = newContent;
        localStorage.setItem('currentSummary', newContent);
        
        showCelebration('AI summary generated! 🤖✨');
        
    } catch (error) {
        console.error('Error generating AI summary:', error);
        
        let errorMessage = 'Could not generate AI summary. ';
        if (error.message.includes('fetch')) {
            errorMessage += 'Make sure Ollama is running on localhost:11434';
        } else {
            errorMessage += 'Check console for details.';
        }
        
        alert(errorMessage);
    } finally {
        generateBtn.textContent = originalText;
        generateBtn.disabled = false;
    }
}

// Dependency Graph Visualization
function initializeGraph() {
    const container = document.getElementById('dependencyGraph');
    if (!container) return;
    
    svg = d3.select('#dependencyGraph')
        .attr('width', '100%')
        .attr('height', 400);

    // Create main group for zoom/pan
    mainGroup = svg.append('g')
        .attr('class', 'main-group');

    // Set up zoom behavior
    zoomBehavior = d3.zoom()
        .scaleExtent([minZoom, maxZoom])
        .on('zoom', function(event) {
            mainGroup.attr('transform', event.transform);
            currentZoom = event.transform.k;
            updateZoomDisplay();
        });

    svg.call(zoomBehavior);

    // Add arrow marker for dependency lines
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#94a3b8');

    updateZoomDisplay();
    refreshGraph();
}

function updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoomLevel');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
    }
    
    // Enable/disable zoom buttons based on current zoom level
    if (zoomInBtn) {
        zoomInBtn.disabled = currentZoom >= maxZoom;
    }
    if (zoomOutBtn) {
        zoomOutBtn.disabled = currentZoom <= minZoom;
    }
}

function zoomIn() {
    if (currentZoom >= maxZoom) return;
    
    const newZoom = Math.min(currentZoom * 1.5, maxZoom);
    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));
    
    svg.transition()
        .duration(300)
        .call(
            zoomBehavior.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(newZoom)
                .translate(-width / 2, -height / 2)
        );
}

function zoomOut() {
    if (currentZoom <= minZoom) return;
    
    const newZoom = Math.max(currentZoom / 1.5, minZoom);
    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));
    
    svg.transition()
        .duration(300)
        .call(
            zoomBehavior.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(newZoom)
                .translate(-width / 2, -height / 2)
        );
}

function resetGraphView() {
    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));
    
    svg.transition()
        .duration(500)
        .call(
            zoomBehavior.transform,
            d3.zoomIdentity.translate(width / 2, height / 2).scale(1).translate(-width / 2, -height / 2)
        );
}

function refreshGraph() {
    if (!svg || !mainGroup) return;

    const showCompleted = document.getElementById('showCompletedNodes')?.checked || false;
    const highlightBlocked = document.getElementById('highlightBlocked')?.checked || false;

    // Clear previous graph content (but keep defs and main group structure)
    mainGroup.selectAll('*').remove();

    // Filter tasks based on settings
    let visibleTasks = currentTasks.filter(task => 
        showCompleted || !task.completed
    );

    if (visibleTasks.length === 0) {
        // Show empty state
        mainGroup.append('text')
            .attr('x', parseInt(svg.style('width')) / 2)
            .attr('y', parseInt(svg.style('height')) / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '16px')
            .text('No tasks to display');
        return;
    }

    // Prepare nodes and links data
    const nodes = visibleTasks.map(task => {
        const dependencies = Array.isArray(task.dependsOn) ? task.dependsOn : [];
        const incompleteDeps = dependencies
            .map(depId => currentTasks.find(t => t.id === depId))
            .filter(dep => dep && !dep.completed);

        return {
            id: task.id,
            text: task.text,
            completed: task.completed,
            priority: task.priority || 'medium',
            isBlocked: incompleteDeps.length > 0,
            dependencies: dependencies,
            goalId: task.goalId
        };
    });

    const links = [];
    visibleTasks.forEach(task => {
        const dependencies = Array.isArray(task.dependsOn) ? task.dependsOn : [];
        dependencies.forEach(depId => {
            const depTask = visibleTasks.find(t => t.id === depId);
            if (depTask) {
                const isBlocking = !depTask.completed;
                links.push({
                    source: depId,
                    target: task.id,
                    isBlocking: isBlocking
                });
            }
        });
    });

    // Set up the simulation with reduced repulsive force
    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));

    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-150))  // Reduced from -300 to -150
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(35));

    // Create links
    const link = mainGroup.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('class', d => `graph-link ${d.isBlocking && highlightBlocked ? 'blocking' : ''}`)
        .attr('stroke', d => d.isBlocking && highlightBlocked ? '#ef4444' : '#94a3b8')
        .attr('stroke-width', d => d.isBlocking && highlightBlocked ? 3 : 2)
        .attr('stroke-dasharray', d => d.isBlocking && highlightBlocked ? '5,5' : 'none')
        .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    const node = mainGroup.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add circles to nodes
    node.append('circle')
        .attr('r', 20)
        .attr('class', d => {
            let classes = ['graph-node'];
            if (d.completed) classes.push('completed');
            else if (d.isBlocked && highlightBlocked) classes.push('blocked');
            else classes.push('incomplete');
            classes.push(`${d.priority}-priority`);
            return classes.join(' ');
        })
        .attr('fill', d => {
            if (d.completed) return '#d1fae5';
            if (d.isBlocked && highlightBlocked) return '#fee2e2';
            return '#f1f5f9';
        })
        .attr('stroke', d => {
            if (d.completed) return '#10b981';
            if (d.isBlocked && highlightBlocked) return '#ef4444';
            return '#64748b';
        })
        .attr('stroke-width', d => {
            const baseWidth = d.priority === 'high' ? 3 : 2;
            return baseWidth;
        });

    // Add goal indicator (small circle in top-right)
    node.filter(d => d.goalId)
        .append('circle')
        .attr('r', 6)
        .attr('cx', 15)
        .attr('cy', -15)
        .attr('fill', '#f59e0b')
        .attr('stroke', '#d97706')
        .attr('stroke-width', 1);

    // Add goal emoji
    node.filter(d => d.goalId)
        .append('text')
        .attr('x', 15)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .text('🎯');

    // Add priority indicators
    node.append('text')
        .attr('class', 'priority-indicator')
        .attr('x', -15)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .text(d => {
            if (d.priority === 'high') return '🔴';
            if (d.priority === 'medium') return '🟡';
            if (d.priority === 'low') return '🟢';
            return '';
        });

    // Add text labels
    node.append('text')
        .attr('class', 'graph-text')
        .attr('dy', '.35em')
        .attr('font-size', '10px')
        .attr('text-anchor', 'middle')
        .text(d => {
            const maxLength = 12;
            return d.text.length > maxLength ? 
                d.text.substring(0, maxLength) + '...' : 
                d.text;
        })
        .call(wrap, 40);

    // Add completion checkmark
    node.filter(d => d.completed)
        .append('text')
        .attr('x', 0)
        .attr('y', 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('fill', '#10b981')
        .text('✓');

    // Add tooltips on hover
    node.append('title')
        .text(d => {
            const goal = d.goalId ? goals.find(g => g.id === d.goalId) : null;
            let tooltip = `${d.text}\nPriority: ${d.priority}`;
            if (goal) tooltip += `\nGoal: ${goal.title}`;
            if (d.completed) tooltip += '\nStatus: Completed';
            else if (d.isBlocked) tooltip += '\nStatus: Blocked by dependencies';
            else tooltip += '\nStatus: Available';
            if (d.dependencies.length > 0) {
                tooltip += `\nDependencies: ${d.dependencies.length}`;
            }
            return tooltip;
        });

    // Click handler for nodes
    node.on('click', function(event, d) {
        // Prevent zoom on node click
        event.stopPropagation();
        
        // Highlight connected nodes
        const connectedNodes = new Set();
        const connectedLinks = new Set();

        // Find all connections
        links.forEach(link => {
            if (link.source.id === d.id || link.target.id === d.id) {
                connectedLinks.add(link);
                connectedNodes.add(link.source.id);
                connectedNodes.add(link.target.id);
            }
        });

        // Reset all styles
        node.selectAll('circle').attr('stroke-width', d => d.priority === 'high' ? 3 : 2);
        link.attr('stroke-width', d => d.isBlocking && highlightBlocked ? 3 : 2);

        // Highlight connected elements
        node.filter(n => connectedNodes.has(n.id))
            .selectAll('circle')
            .attr('stroke-width', 4);

        link.filter(l => connectedLinks.has(l))
            .attr('stroke-width', 4);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

// Text wrapping function for node labels
function wrap(text, width) {
    text.each(function() {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = text.attr('y');
        const dy = parseFloat(text.attr('dy'));
        let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');
        
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));
            if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];
                tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
            }
        }
    });
}

// Drag functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// Utility functions
function saveCurrentTasks() {
    localStorage.setItem('currentTasks', JSON.stringify(currentTasks));
}

function saveGoals() {
    localStorage.setItem('goals', JSON.stringify(goals));
}

// Enter key handler for task input
document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Initialize the app when page loads
init();
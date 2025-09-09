// Data structure
let currentTasks = JSON.parse(localStorage.getItem('currentTasks')) || [];
let weeklyHistory = JSON.parse(localStorage.getItem('weeklyHistory')) || [];

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
                    (task.dependsOn ? [task.dependsOn] : [])
    }));
    saveCurrentTasks();
    
    renderTasks();
    renderHistory();
    updateStats();
    loadCurrentSummary();
    initializeGraph();
}

// Task management with multiple dependencies
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
    renderSelectedDependencies();
    
    taskForm.style.display = 'block';
    formInput.focus();
}

function hideTaskForm() {
    document.getElementById('taskForm').style.display = 'none';
    document.getElementById('taskFormInput').value = '';
    document.getElementById('dependsOn').value = '';
    document.getElementById('priority').value = 'medium';
    selectedDependencies = [];
    renderSelectedDependencies();
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
        priority: 'medium'
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
        priority: priority
    };
    
    currentTasks.push(task);
    saveCurrentTasks();
    renderTasks();
    updateStats();
    refreshGraph();
    hideTaskForm();
    
    const depCount = selectedDependencies.length;
    const message = depCount > 0 ? `Task created with ${depCount} dependencies! 📋🔗` : 'Task created! 📋';
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
        
        // Find incomplete dependencies
        const incompleteDeps = dependencies
            .map(depId => currentTasks.find(t => t.id === depId))
            .filter(dep => dep && !dep.completed);
        
        const isBlocked = incompleteDeps.length > 0;
        const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
        
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

// Event delegation for task actions
document.addEventListener('DOMContentLoaded', function() {
    const taskList = document.getElementById('taskList');
    const historyList = document.getElementById('historyList');
    
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
        completedCount: currentTasks.filter(t => t.completed).length,
        totalCount: currentTasks.length
    };
    
    weeklyHistory.unshift(weekData);
    localStorage.setItem('weeklyHistory', JSON.stringify(weeklyHistory));
    
    renderHistory();
    updateStats();
    
    showCelebration('Week saved! 🎉 Great progress this week!');
}

function clearWeek() {
    if (currentTasks.length > 0 || document.getElementById('weeklySummary').value.trim() !== '') {
        if (!confirm('This will clear your current tasks and summary. Are you sure?')) {
            return;
        }
    }
    
    // Only keep unfinished tasks for the new week
    currentTasks = currentTasks.filter(task => !task.completed);
    document.getElementById('weeklySummary').value = '';
    saveCurrentTasks();
    localStorage.removeItem('currentSummary');
    renderTasks();
    updateStats();
    refreshGraph();
    
    showCelebration('Fresh start! Unfinished tasks carried over. Ready for another productive week! 💪');
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
    
    document.getElementById('tasksCompleted').textContent = completedThisWeek;
    document.getElementById('totalTasks').textContent = totalThisWeek;
    document.getElementById('weeksTracked').textContent = weeklyHistory.length;
    document.getElementById('completionRate').textContent = completionRate + '%';
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
        const taskList = completedTasks.map(task => `• ${task.text}`).join('\n');
        
        const prompt = `You are helping someone track their progress in building an algorithmic trading business. They completed these tasks this week:

${taskList}

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
            dependencies: dependencies
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

    // Set up the simulation
    const width = parseInt(svg.style('width'));
    const height = parseInt(svg.style('height'));

    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
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

    // Add priority indicators
    node.append('text')
        .attr('class', 'priority-indicator')
        .attr('x', 15)
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
            let tooltip = `${d.text}\nPriority: ${d.priority}`;
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

// Enter key handler for task input
document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Initialize the app when page loads
init();
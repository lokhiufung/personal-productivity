# Personal Productivity Progress Tracker

This is a simple, yet powerful, single-page web application designed to help you track your weekly progress. Built with HTML, CSS, and JavaScript, it provides a clean and intuitive interface for managing tasks, celebrating accomplishments, and maintaining a history of your work. Check the demo [here](https://lokhiufung.github.io/personal-productivity/main.html)

## Features

*   **Weekly Task Management:** Add, edit, and delete tasks for the current week.
*   **Task Completion:** Mark tasks as complete to track your progress.
*   **Task Dependencies:** Define dependencies between tasks, ensuring a logical workflow.
*   **Task Priorities:** Assign priorities (High, Medium, Low) to focus on what matters most.
*   **Task Dependency Graph:** Visualize your tasks and their dependencies in an interactive force-directed graph.
*   **Weekly Summaries:** Write and save a summary of your accomplishments each week.
*   **AI-Powered Reflections:** Automatically generate a summary of your completed tasks using a local AI model (Ollama).
*   **Progress History:** Review your past weekly summaries and task completion rates.
*   **Local Storage:** All your data is saved in your browser's local storage, so your progress is preserved between sessions.
*   **Responsive Design:** The application is designed to work on both desktop and mobile devices.

## How to Run

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/personal-productivity.git
    cd personal-productivity
    ```
2.  **Run the local server:**
    The included `run_server.sh` script starts a simple Python web server.
    ```bash
    ./run_server.sh
    ```
3.  **Open in your browser:**
    Navigate to `http://localhost:8000` in your web browser to use the application.

## Task Dependency Graph

The application includes an interactive task dependency graph, powered by D3.js. This graph provides a visual representation of your tasks and their relationships, helping you to understand the overall structure of your work and identify critical paths.

### Graph Features

*   **Force-Directed Layout:** The graph uses a force-directed layout to automatically arrange the nodes (tasks) and links (dependencies) in a clear and readable way.
*   **Interactive Nodes:** Click on a task node to highlight its connections to other tasks.
*   **Visual Cues:** The graph uses different colors and styles to indicate the status of each task (e.g., completed, blocked, available) and its priority.
*   **Graph Controls:** You can customize the graph view by toggling the visibility of completed tasks and highlighting blocked tasks.

## (Optional) AI Summary Generation

This application can use a local AI model to generate weekly summaries. To enable this feature, you need to have [Ollama](https://ollama.ai/) installed and running.

1.  **Install Ollama:** Follow the instructions on the [Ollama website](https://ollama.ai/) to download and install it.
2.  **Pull a model:**
    ```bash
    ollama pull granite3.3:2b
    ```
3.  **Run Ollama:** Make sure the Ollama application is running in the background.

The application will automatically connect to the Ollama API running at `http://localhost:11434`.

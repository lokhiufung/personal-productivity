# Personal Productivity Progress Tracker

This is a simple, yet powerful, single-page web application designed to help you track your weekly progress. Built with HTML, CSS, and JavaScript, it provides a clean and intuitive interface for managing tasks, celebrating accomplishments, and maintaining a history of your work.

## Features

*   **Weekly Task Management:** Add, edit, and delete tasks for the current week.
*   **Task Completion:** Mark tasks as complete to track your progress.
*   **Task Dependencies:** Define dependencies between tasks, ensuring a logical workflow.
*   **Task Priorities:** Assign priorities (High, Medium, Low) to focus on what matters most.
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

## (Optional) AI Summary Generation

This application can use a local AI model to generate weekly summaries. To enable this feature, you need to have [Ollama](https://ollama.ai/) installed and running.

1.  **Install Ollama:** Follow the instructions on the [Ollama website](https://ollama.ai/) to download and install it.
2.  **Pull a model:**
    ```bash
    ollama pull granite3.3:2b
    ```
3.  **Run Ollama:** Make sure the Ollama application is running in the background.

The application will automatically connect to the Ollama API running at `http://localhost:11434`.

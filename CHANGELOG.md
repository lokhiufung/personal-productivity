# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

-   **Goal Management:**
    -   Users can now create, edit, and delete goals.
    -   Goals have a title, description, deadline, and priority.
    -   Goals can be marked as complete.
    -   The UI now displays a list of goals with their progress.
-   **Task-Goal Linking:**
    -   Tasks can be linked to goals.
    -   The task dependency graph now visually indicates which tasks are linked to goals.
-   **Enhanced Stats:**
    -   The stats section now includes metrics for goals completed and total goals.
-   **Improved AI Summary:**
    -   The AI-generated weekly summary now includes information about completed goals.

### Changed

-   The header text has been updated for clarity.
-   Refactor CSS and JavaScript into separate files (`assets/styles.css` and `assets/app.js`).

### Fixed

-   Enhance `clearWeek` function to remove completed tasks and clean up dependencies.

## [0.2.0] - 2025-09-09

### Added

-   Add zoom and reset view functionality to the dependency graph.

### Changed

-   Refactor CSS and JavaScript into separate files (`assets/styles.css` and `assets/app.js`).

## [0.1.0] - 2025-08-26

### Added

-   Task Dependency Graph: Visualize tasks and their dependencies in an interactive force-directed graph (0e34950, 4835155).
-   Initial version of the Personal Productivity Progress Tracker (0a6dd54).

### Changed

-   Enhanced task management UI with dependency graph visualization and improved task item styling (4835155).

### Documentation

-   Add README.md for Personal Productivity Progress Tracker (2c5b31c).
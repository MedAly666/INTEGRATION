# SQL Query Interface Documentation

## Overview

The SQL Query Interface is a professional-grade SQL execution environment designed for the Data Integration System. It provides a modern, feature-rich interface for executing SQL queries against multiple data sources, with a focus on developer productivity and a great user experience.

## Features

### SQL Editor

- **Syntax Highlighting**: SQL keywords, functions, strings, and comments are highlighted for better readability
- **Line Numbers**: Line numbers help with navigation and error identification
- **Format SQL**: One-click formatting of SQL queries for better readability
- **Keyboard Shortcuts**:
  - `Ctrl+Enter`: Execute the current query
  - `Ctrl+S`: Save the current query
  - `Ctrl+/`: Comment/uncomment the current line or selection

### Results Panel

- **Results Tab**: Displays query results in a tabular format
- **Messages Tab**: Shows execution messages, errors, and status updates
- **Execution Plan Tab**: Displays the execution plan for EXPLAIN queries
- **Export**: Export results to CSV format

### Schema Browser

- **Database Structure**: Browse available tables and schemas
- **Search**: Search for specific tables by name
- **Table Preview**: Preview the first 10 rows of any table with a single click

### Query Management

- **Query History**: Automatically saves executed queries for later reference
- **Save/Load Queries**: Save frequently used queries with names and descriptions
- **SQL Templates**: Pre-defined query templates for common operations

### Data Source Options

- **Multiple Sources**: Execute queries against SQL, XML, or Neo4j data sources
- **Result Limits**: Configure the maximum number of results to return

## Using the Interface

### Executing Queries

1. Enter your SQL query in the editor area
2. Select your data source and result limit options from the dropdowns
3. Click the "Run" button or press `Ctrl+Enter` to execute
4. View results in the results panel below

### Using Templates

1. Select a template from the "SQL Templates" dropdown
2. The template will be loaded into the editor
3. Modify the query as needed
4. Execute the query as normal

### Saving Queries

1. Enter your SQL query in the editor
2. Click the "Save" button or press `Ctrl+S`
3. Enter a name and optional description for the query
4. Click "Save Query"

### Loading Saved Queries

1. Click the "Load" button
2. Select a saved query from the list
3. The query will be loaded into the editor

### Browsing Schema

1. Use the schema browser in the left sidebar to explore available tables
2. Double-click on a table name to insert it into the editor
3. Click the eye icon next to a table to preview its first 10 rows

### Query History

- Previously executed queries are stored in the history panel
- Click on any history item to load it into the editor
- Use the clear button to reset the history

## Technical Implementation

The SQL interface is built using:

- Pug templates for HTML structure
- CSS for styling with responsive design
- JavaScript for interactive functionality
- Fetch API for communication with the backend
- LocalStorage for persistent storage of query history and saved queries

## Backend Integration

The interface communicates with the backend through the following API endpoints:

- `/api/query`: Executes SQL queries and returns results
- `/api/table-preview`: Retrieves preview data for tables

## Customization

The interface supports both light and dark themes through the application's theme settings. UI elements automatically adapt to the selected theme.

<?php
/**
 * index.php
 * Example usage of the virtual data integration solution
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Auto-load classes
spl_autoload_register(function ($class) {
    $prefix = 'Integration\\';
    $baseDir = __DIR__ . '/';
    
    // Check if the class uses the namespace prefix
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    // Get the relative class name
    $relativeClass = substr($class, $len);
    
    // Replace namespace separators with directory separators in the relative class name
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    
    // Fix case sensitivity issues - handle both "common" and "Common" directories
    $file = str_replace('/Common/', '/common/', $file);
    
    // If the file exists, require it
    if (file_exists($file)) {
        require $file;
    }
});

// Manual include of the adapter files to bypass autoloading issues
require_once __DIR__ . '/adapters/IAdapter.php';
require_once __DIR__ . '/adapters/SQLAdapter.php';
require_once __DIR__ . '/adapters/Neo4jAdapter.php';
require_once __DIR__ . '/adapters/XMLAdapter.php';
require_once __DIR__ . '/mediator/Mediator.php';
require_once __DIR__ . '/common/DataModel.php';  // Add the DataModel.php which contains all collection classes

use Integration\Adapters\SQLAdapter;
use Integration\Adapters\Neo4jAdapter;
use Integration\Adapters\XMLAdapter;
use Integration\Mediator\Mediator;

// Load configuration settings
$config = require(__DIR__ . '/config.php');

// Determine if this is an API request or HTML view
$isApiRequest = isset($_GET['api']) && $_GET['api'] === 'true';

// If it's an API request, set JSON content type
if ($isApiRequest) {
    header('Content-Type: application/json');
}

// Initialize adapters
$sqlAdapter = new SQLAdapter($config['sql']);
$neo4jAdapter = new Neo4jAdapter($config['neo4j']);
$xmlAdapter = new XMLAdapter($config['xml']);

// Initialize mediator with our adapters
$mediator = new Mediator();
$mediator->addAdapter($sqlAdapter)
        ->addAdapter($neo4jAdapter)
        ->addAdapter($xmlAdapter);

// Connect to all data sources
$connected = $mediator->connect();
if (!$connected) {
    die("Failed to connect to one or more data sources");
}

// Initialize query processor
$mediator->initQueryProcessor();

// Simple routing
$route = $_GET['route'] ?? 'info';

if ($isApiRequest) {
    // API RESPONSE HANDLING
    switch ($route) {
        case 'info':
            // System information
            echo json_encode([
                'system' => 'Data Integration System',
                'version' => '1.0.0',
                'sources' => [
                    'SQL Database', 
                    'Neo4j Graph Database', 
                    'XML Files'
                ],
                'endpoints' => [
                    'info' => 'System information',
                    'clients' => 'List all clients',
                    'employees' => 'List all employees',
                    'agencies' => 'List all agencies',
                    'products' => 'List all products',
                    'orders' => 'List all orders',
                    'validate' => 'Validate data consistency',
                    'stats' => 'Get data statistics',
                    'duplicates' => 'Find potential duplicate clients',
                    'complex-query' => 'Execute complex queries across data sources'
                ]
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'clients':
            echo json_encode([
                'clients' => $mediator->getClients()->getItems()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'employees':
            echo json_encode([
                'employees' => $mediator->getEmployees()->getItems()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'agencies':
            echo json_encode([
                'agencies' => $mediator->getAgences()->getItems()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'products':
            echo json_encode([
                'products' => $mediator->getProduits()->getItems()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'orders':
            echo json_encode([
                'orders' => $mediator->getCommandes()->getItems()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'validate':
            // Validate data consistency across all sources
            echo json_encode([
                'validation' => $mediator->validateDataConsistency()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'stats':
            // Get statistics about the integrated data
            echo json_encode([
                'statistics' => $mediator->getDataStatistics()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'duplicates':
            // Find potential duplicate clients
            echo json_encode([
                'potentialDuplicates' => $mediator->findPotentialDuplicateClients()
            ], JSON_PRETTY_PRINT);
            break;
            
        case 'complex-query':
            // Check if query parameter is provided
            if (!isset($_POST['query'])) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Query parameter is required',
                    'usage' => 'POST with query parameter containing your complex query string'
                ], JSON_PRETTY_PRINT);
                break;
            }
            
            $query = $_POST['query'];
            $parameters = isset($_POST['parameters']) ? json_decode($_POST['parameters'], true) : [];
            
            try {
                $result = $mediator->executeQuery($query, $parameters);
                echo json_encode([
                    'success' => true,
                    'results' => $result
                ], JSON_PRETTY_PRINT);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => $e->getMessage()
                ], JSON_PRETTY_PRINT);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode([
                'error' => 'Route not found',
                'availableRoutes' => [
                    'info', 'clients', 'employees', 'agencies', 
                    'products', 'orders', 'validate', 'stats', 'duplicates'
                ]
            ], JSON_PRETTY_PRINT);
    }
} else {
    // HTML VIEW HANDLING
    // Function to print tables from collections
    function printTable($items, $title) {
        echo "<h2>{$title}</h2>";
        
        if (empty($items)) {
            echo "<p>No data available.</p>";
            return;
        }
        
        echo "<table border='1' cellpadding='5' cellspacing='0'>";
        
        // Print table header
        echo "<tr style='background-color: #f0f0f0;'>";
        foreach (get_object_vars($items[0]) as $property => $value) {
            echo "<th>{$property}</th>";
        }
        echo "</tr>";
        
        // Print table rows
        foreach ($items as $item) {
            echo "<tr>";
            foreach (get_object_vars($item) as $property => $value) {
                echo "<td>" . (is_null($value) ? "NULL" : htmlspecialchars($value)) . "</td>";
            }
            echo "</tr>";
        }
        
        echo "</table>";
    }

    // HTML header
    echo "<!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Data Integration Project</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2c3e50; }
            h2 { color: #3498db; margin-top: 30px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 30px; }
            th { background-color: #3498db; color: white; text-align: left; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .source-sql { background-color: #d5f5e3; }
            .source-neo4j { background-color: #d6eaf8; }
            .source-xml { background-color: #fadbd8; }
            .info-box { background-color: #f9e79f; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <h1>Multi-Source Data Integration System</h1>
        <div class='info-box'>
            <strong>Integration Architecture:</strong> This system demonstrates data integration across heterogeneous data sources:
            <ul>
                <li><strong>SQL Database</strong> - Relational store for core business data (stored in /sql/data-01.sql)</li>
                <li><strong>Neo4j Graph Database</strong> - Graph-based data storage for relationship-intensive data (stored in /neo4j/data-03.cql)</li>
                <li><strong>XML Documents</strong> - Semi-structured XML data source (stored in /xml/data-03.xml)</li>
            </ul>
            The integration layer uses the Adapter Pattern to normalize access across sources and a Mediator to coordinate data retrieval and transformation.
        </div>";

    // Display data based on route
    switch($route) {
        case 'info':
        default:
            echo "<h2>System Overview</h2>";
            echo "<p>This is a data integration system that combines data from multiple heterogeneous sources.</p>";
            echo "<h3>Available Endpoints:</h3>";
            echo "<ul>";
            echo "<li><a href='?route=clients'>Clients</a></li>";
            echo "<li><a href='?route=employees'>Employees</a></li>";
            echo "<li><a href='?route=agencies'>Agencies</a></li>";
            echo "<li><a href='?route=products'>Products</a></li>";
            echo "<li><a href='?route=orders'>Orders</a></li>";
            echo "<li><a href='?route=complex-query'>Complex Queries</a></li>";
            echo "</ul>";
            
            echo "<h3>API Access:</h3>";
            echo "<ul>";
            echo "<li><a href='?route=info&api=true'>API - System Info</a></li>";
            echo "<li><a href='?route=clients&api=true'>API - Clients</a></li>";
            echo "</ul>";
            break;
            
        case 'clients':
            $clients = $mediator->getClients()->getItems();
            printTable($clients, "Integrated Client Data");
            break;
            
        case 'employees':
            $employees = $mediator->getEmployees()->getItems();
            printTable($employees, "Integrated Employee Data");
            break;
            
        case 'agencies':
            $agencies = $mediator->getAgences()->getItems();
            printTable($agencies, "Integrated Agency Data");
            break;
            
        case 'products':
            $products = $mediator->getProduits()->getItems();
            printTable($products, "Integrated Product Data");
            break;
            
        case 'orders':
            $orders = $mediator->getCommandes()->getItems();
            printTable($orders, "Integrated Order Data");
            break;
            
        case 'complex-query':
            echo "<h2>Complex Query Execution</h2>";
            echo "<div class='info-box'>";
            echo "<p>Execute complex queries across all data sources. The query processor supports:</p>";
            echo "<ul>";
            echo "<li>Joins across different data sources</li>";
            echo "<li>Aggregation functions (COUNT, AVG, SUM, MIN, MAX)</li>";
            echo "<li>Filtering with WHERE clauses</li>";
            echo "<li>Sorting with ORDER BY</li>";
            echo "</ul>";
            echo "<p><strong>Example:</strong> <code>SELECT c.nom, COUNT(o.id) as orderCount FROM clients c JOIN commandes o ON c.id = o.client_id GROUP BY c.nom ORDER BY orderCount DESC</code></p>";
            echo "</div>";
            
            // Process form submission if any
            $queryResults = null;
            $error = null;
            $query = '';
            
            if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['query'])) {
                $query = $_POST['query'];
                try {
                    $params = [];
                    $queryResults = $mediator->executeQuery($query, $params);
                } catch (Exception $e) {
                    $error = $e->getMessage();
                }
            }
            
            // Display the query form
            echo "<form method='post' action='?route=complex-query'>";
            echo "<div style='margin: 20px 0;'>";
            echo "<label for='query'><strong>Enter your complex query:</strong></label><br>";
            echo "<textarea id='query' name='query' rows='6' style='width: 100%; font-family: monospace; padding: 10px;'>" . htmlspecialchars($query) . "</textarea>";
            echo "</div>";
            echo "<div style='margin: 10px 0;'>";
            echo "<button type='submit' style='background-color: #3498db; color: white; padding: 10px 15px; border: none; cursor: pointer;'>Execute Query</button>";
            echo "</div>";
            echo "</form>";
            
            // Display results if any
            if ($queryResults !== null) {
                echo "<h3>Query Results:</h3>";
                
                if (empty($queryResults)) {
                    echo "<p>No results found.</p>";
                } else {
                    echo "<table border='1' cellpadding='5' cellspacing='0'>";
                    
                    // Get all possible columns by examining all result objects
                    $allColumns = [];
                    foreach ($queryResults as $row) {
                        if (is_object($row)) {
                            foreach (get_object_vars($row) as $column => $value) {
                                if (!in_array($column, $allColumns)) {
                                    $allColumns[] = $column;
                                }
                            }
                        } elseif (is_array($row)) {
                            foreach ($row as $column => $value) {
                                if (!in_array($column, $allColumns)) {
                                    $allColumns[] = $column;
                                }
                            }
                        }
                    }
                    
                    // Print table header with all columns
                    if (!empty($allColumns)) {
                        echo "<tr style='background-color: #3498db; color: white;'>";
                        foreach ($allColumns as $column) {
                            echo "<th>" . htmlspecialchars($column) . "</th>";
                        }
                        echo "</tr>";
                        
                        // Print table rows
                        foreach ($queryResults as $row) {
                            echo "<tr>";
                            foreach ($allColumns as $column) {
                                $value = null;
                                
                                if (is_object($row) && isset($row->{$column})) {
                                    $value = $row->{$column};
                                } elseif (is_array($row) && isset($row[$column])) {
                                    $value = $row[$column];
                                }
                                
                                // Format the value for display
                                if (is_object($value)) {
                                    $display = get_class($value) . " Object";
                                } elseif (is_array($value)) {
                                    $display = "Array[" . count($value) . "]";
                                } else {
                                    $display = is_null($value) ? "NULL" : (string)$value;
                                }
                                
                                echo "<td>" . htmlspecialchars($display) . "</td>";
                            }
                            echo "</tr>";
                        }
                    } else {
                        echo "<tr><td>No columns found in result data</td></tr>";
                    }
                    
                    echo "</table>";
                    
                    echo "<p><small>Showing " . count($queryResults) . " result(s).</small></p>";
                }
            } elseif ($error !== null) {
                echo "<div style='background-color: #fadbd8; padding: 15px; border-radius: 5px; margin: 20px 0;'>";
                echo "<strong>Error executing query:</strong><br>";
                echo htmlspecialchars($error);
                echo "</div>";
            }
            break;
    }
    
    echo "</body>
    </html>";
}
?>
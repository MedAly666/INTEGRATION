<?php
/**
 * Join Query Test
 * Tests the functionality of the ComplexQueryProcessor JOIN query operations
 */

require_once 'config.php';
require_once 'adapters/IAdapter.php';  // Add the interface before the implementation classes
require_once 'mediator/Mediator.php';
require_once 'common/ComplexQueryProcessor.php';
require_once 'adapters/SQLAdapter.php';
require_once 'adapters/Neo4jAdapter.php';
require_once 'adapters/XMLAdapter.php';

use Integration\Common\ComplexQueryProcessor;
use Integration\Mediator\Mediator;
use Integration\Adapters\SQLAdapter;
use Integration\Adapters\Neo4jAdapter;
use Integration\Adapters\XMLAdapter;

// Create mediator with adapters
$mediator = new Mediator();

// Initialize adapters (add your proper configuration here)
$sqlAdapter = new SQLAdapter();
$neo4jAdapter = new Neo4jAdapter();
$xmlAdapter = new XMLAdapter();

// Add adapters to mediator
$mediator->addAdapter($sqlAdapter)
         ->addAdapter($neo4jAdapter)
         ->addAdapter($xmlAdapter)
         ->initQueryProcessor();

// Create query processor
$queryProcessor = $mediator->getQueryProcessor();

// First, let's check the individual data sources
echo "Checking data sources before joining:\n";
echo "===================================\n";

// Check clients
echo "Clients data:\n";
$clientsQuery = "SELECT FROM clients";
$clientsResults = $queryProcessor->executeQuery($clientsQuery);
echo "Total clients: " . count($clientsResults) . "\n";
if (count($clientsResults) > 0) {
    echo "First client sample:\n";
    $client = $clientsResults[0];
    foreach ((array)$client as $key => $value) {
        echo "  $key: $value\n";
    }
}
echo "\n";

// Check commandes
echo "Commandes data:\n";
$commandesQuery = "SELECT FROM commandes";
$commandesResults = $queryProcessor->executeQuery($commandesQuery);
echo "Total commandes: " . count($commandesResults) . "\n";
if (count($commandesResults) > 0) {
    echo "First commande sample:\n";
    $commande = $commandesResults[0];
    foreach ((array)$commande as $key => $value) {
        echo "  $key: $value\n";
    }
}
echo "\n";

// Now execute a JOIN query to test the fix
// IMPORTANT: Make sure the field names match exactly what's in the data objects
// If field names don't match, the join won't work even if our code is correct
$joinQuery = "SELECT FROM clients JOIN commandes ON clients.id = commandes.clientRef";
try {
    // Execute the join query
    $results = $queryProcessor->executeQuery($joinQuery);
    
    // Output the results
    echo "Join Query Test Results:\n";
    echo "------------------------\n";
    echo "Total results: " . count($results) . "\n\n";
    
    // Display the first few results
    $count = 0;
    foreach ($results as $result) {
        echo "Result #" . (++$count) . ":\n";
        foreach ((array)$result as $key => $value) {
            echo "  $key: $value\n";
        }
        echo "\n";
        
        // Limit displayed results to 3 for readability
        if ($count >= 3) {
            echo "... (remaining results truncated)\n";
            break;
        }
    }
    
    echo "\nJOIN operation successful!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>
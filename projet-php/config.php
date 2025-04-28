<?php
/**
 * config.php
 * Configuration settings for data sources
 */

return [
    // SQL Adapter settings
    'sql' => [
        'enabled' => true,
        'host' => 'localhost',
        'database' => 'MAGASIN_SQL',
        'username' => 'root',
        'password' => 'root',
        'port' => 3306
    ],
    
    // Neo4j Adapter settings
    'neo4j' => [
        'enabled' => true,
        'use_real_connection' => false, // Set to true to use actual Neo4j database
        'uri' => 'bolt://localhost:7687',
        'username' => 'neo4j',
        'password' => 'neo4j'
    ],
    
    // XML Adapter settings
    'xml' => [
        'enabled' => true,
        'file_path' => '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/xml/data-03.xml' // null means use default path relative to project
    ]
];
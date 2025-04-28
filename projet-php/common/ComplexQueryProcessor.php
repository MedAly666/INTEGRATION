<?php
/**
 * ComplexQueryProcessor.php
 * Handles complex queries across multiple data sources
 */

namespace Integration\Common;

use Integration\Mediator\Mediator;

class ComplexQueryProcessor {
    /**
     * @var Mediator The mediator instance
     */
    private $mediator;
    
    /**
     * Constructor
     * 
     * @param Mediator $mediator The mediator instance
     */
    public function __construct(Mediator $mediator) {
        $this->mediator = $mediator;
    }
    
    /**
     * Execute a complex query
     * 
     * @param string $query The complex query string
     * @param array $parameters Optional parameters for the query
     * @return array The query results
     */
    public function executeQuery(string $query, array $parameters = []): array {
        // Ensure connections are established before running queries
        $this->ensureConnection();
        
        // Parse the query
        $queryParts = $this->parseQuery($query);
        
        // Execute the query based on the parsed parts
        $results = $this->processQueryParts($queryParts, $parameters);
        
        return $results;
    }
    
    /**
     * Ensure a proper connection to all data sources before executing queries
     *
     * @return bool True if connection was successful
     * @throws \Exception If connection fails
     */
    private function ensureConnection(): bool {
        $connected = $this->mediator->connect();
        
        if (!$connected) {
            throw new \Exception("Failed to establish connection to one or more data sources. Please check your configuration.");
        }
        
        return true;
    }
    
    /**
     * Parse a complex query string into structured parts
     * 
     * @param string $query The query string
     * @return array The parsed query parts
     */
    private function parseQuery(string $query): array {
        // Basic parsing - this can be enhanced for more complex query languages
        $queryParts = [
            'type' => '',
            'entities' => [],
            'filters' => [],
            'joins' => [],
            'sort' => [],
            'limit' => null
        ];
        
        // Extract query type (SELECT, AGGREGATE, etc.)
        if (preg_match('/^(SELECT|AGGREGATE|JOIN|FILTER)\s/i', $query, $matches)) {
            $queryParts['type'] = strtoupper($matches[1]);
        }
        
        // Extract entities (FROM)
        if (preg_match('/\sFROM\s+([\w,\s]+)/i', $query, $matches)) {
            $entities = array_map('trim', explode(',', $matches[1]));
            $queryParts['entities'] = $entities;
        }
        
        // Extract filters (WHERE)
        if (preg_match('/\sWHERE\s+(.+?)(?:\sGROUP BY|\sORDER BY|\sLIMIT|\s*$)/is', $query, $matches)) {
            $queryParts['filters'] = $this->parseFilters($matches[1]);
        }
        
        // Extract joins
        if (preg_match_all('/\sJOIN\s+(\w+)\s+ON\s+(.+?)(?:\sJOIN|\sWHERE|\sGROUP BY|\sORDER BY|\sLIMIT|\s*$)/is', $query, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $queryParts['joins'][] = [
                    'entity' => $match[1],
                    'condition' => $match[2]
                ];
            }
        }
        
        // Extract sorting (ORDER BY)
        if (preg_match('/\sORDER BY\s+(.+?)(?:\sLIMIT|\s*$)/is', $query, $matches)) {
            $sortParts = array_map('trim', explode(',', $matches[1]));
            foreach ($sortParts as $part) {
                if (preg_match('/^(\w+(?:\.\w+)?)\s+(ASC|DESC)?$/i', $part, $sortMatch)) {
                    $queryParts['sort'][] = [
                        'field' => $sortMatch[1],
                        'direction' => isset($sortMatch[2]) ? strtoupper($sortMatch[2]) : 'ASC'
                    ];
                }
            }
        }
        
        // Extract limit
        if (preg_match('/\sLIMIT\s+(\d+)/i', $query, $matches)) {
            $queryParts['limit'] = (int)$matches[1];
        }
        
        return $queryParts;
    }
    
    /**
     * Parse filter conditions
     * 
     * @param string $filterString Filter expression string
     * @return array Structured filter conditions
     */
    private function parseFilters(string $filterString): array {
        $filters = [];
        
        // Simple parsing - in a real implementation, this would be more sophisticated
        $conditions = preg_split('/\s+AND\s+|\s+OR\s+/i', $filterString, -1, PREG_SPLIT_OFFSET_CAPTURE);
        
        $lastOperator = null;
        foreach ($conditions as $i => $conditionData) {
            list($condition, $offset) = $conditionData;
            
            // Determine the operator (AND/OR) before this condition (except for the first one)
            if ($i > 0) {
                $textBefore = substr($filterString, 0, $offset);
                if (preg_match('/\s+(AND|OR)\s+$/i', $textBefore, $opMatch)) {
                    $lastOperator = strtoupper($opMatch[1]);
                }
            }
            
            // Parse the condition (field, operator, value)
            if (preg_match('/^\s*(\w+(?:\.\w+)?)\s*(=|!=|>|<|>=|<=|LIKE|IN|NOT IN)\s*(.+)$/i', trim($condition), $matches)) {
                $filters[] = [
                    'field' => $matches[1],
                    'operator' => $matches[2],
                    'value' => trim($matches[3], '\'"()'),
                    'connectorOp' => $lastOperator
                ];
            }
        }
        
        return $filters;
    }
    
    /**
     * Process the parsed query parts to execute the query
     * 
     * @param array $queryParts Structured query parts
     * @param array $parameters Query parameters
     * @return array Query results
     */
    private function processQueryParts(array $queryParts, array $parameters): array {
        $results = [];
        
        // Handle different query types
        switch ($queryParts['type']) {
            case 'SELECT':
                $results = $this->handleSelectQuery($queryParts, $parameters);
                break;
                
            case 'JOIN':
                $results = $this->handleJoinQuery($queryParts, $parameters);
                break;
                
            case 'AGGREGATE':
                $results = $this->handleAggregateQuery($queryParts, $parameters);
                break;
                
            default:
                // Default to simple selection if type is not recognized
                $results = $this->handleSelectQuery($queryParts, $parameters);
        }
        
        // Make sure we return a flat array of results
        if (!empty($results) && is_array($results)) {
            $flatResults = [];
            
            // If results are keyed by entity, flatten them into a single result set
            if (isset($results[0])) {
                // Already a flat array, return as is
                return $results;
            }
            
            foreach ($results as $entityName => $entityData) {
                if (is_array($entityData)) {
                    foreach ($entityData as $item) {
                        $flatResults[] = $item;
                    }
                }
            }
            
            // Replace nested results with flattened array
            return $flatResults;
        }
        
        return $results;
    }
    
    /**
     * Handle SELECT-type queries
     * 
     * @param array $queryParts Structured query parts
     * @param array $parameters Query parameters
     * @return array Query results
     */
    private function handleSelectQuery(array $queryParts, array $parameters): array {
        $results = [];
        
        // Process each entity in the query
        foreach ($queryParts['entities'] as $entity) {
            $entityData = $this->getEntityData($entity);
            
            // Apply filters if any
            if (!empty($queryParts['filters'])) {
                $entityData = $this->applyFilters($entityData, $queryParts['filters'], $parameters);
            }
            
            // Apply sorting if any
            if (!empty($queryParts['sort'])) {
                $entityData = $this->applySorting($entityData, $queryParts['sort']);
            }
            
            // Apply limit if any
            if (!empty($queryParts['limit'])) {
                $entityData = array_slice($entityData, 0, $queryParts['limit']);
            }
            
            $results[$entity] = $entityData;
        }
        
        return $results;
    }
    
    /**
     * Handle JOIN-type queries
     * 
     * @param array $queryParts Structured query parts
     * @param array $parameters Query parameters
     * @return array Query results
     */
    private function handleJoinQuery(array $queryParts, array $parameters): array {
        // Get the base entity data
        $baseEntity = $queryParts['entities'][0] ?? '';
        $baseData = $this->getEntityData($baseEntity);
        $joinedResults = $baseData;
        
        // Apply joins
        foreach ($queryParts['joins'] as $join) {
            $joinEntity = $join['entity'];
            $joinCondition = $join['condition'];
            $joinData = $this->getEntityData($joinEntity);
            
            // Parse join condition to get field names
            if (preg_match('/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i', $joinCondition, $matches)) {
                $leftEntity = $matches[1];
                $leftField = $matches[2];
                $rightEntity = $matches[3];
                $rightField = $matches[4];
                
                // Perform the join operation
                $joinedResults = $this->joinData($joinedResults, $joinData, "$leftEntity.$leftField", "$rightEntity.$rightField");
            }
        }
        
        // Apply filters to the joined data
        if (!empty($queryParts['filters'])) {
            $joinedResults = $this->applyFilters($joinedResults, $queryParts['filters'], $parameters);
        }
        
        // Apply sorting to the joined data
        if (!empty($queryParts['sort'])) {
            $joinedResults = $this->applySorting($joinedResults, $queryParts['sort']);
        }
        
        // Apply limit to the final result set
        if (!empty($queryParts['limit'])) {
            $joinedResults = array_slice($joinedResults, 0, $queryParts['limit']);
        }
        
        // Return the joined results directly as a flat array rather than as an associative array
        // This makes the result format consistent with how the processQueryParts expects it
        return $joinedResults;
    }
    
    /**
     * Handle AGGREGATE-type queries
     * 
     * @param array $queryParts Structured query parts
     * @param array $parameters Query parameters
     * @return array Query results
     */
    private function handleAggregateQuery(array $queryParts, array $parameters): array {
        // Implementation for aggregate functions
        // This would handle COUNT, SUM, AVG, etc.
        return [];  // Placeholder implementation
    }
    
    /**
     * Get data for a specific entity type from the mediator
     * 
     * @param string $entity Entity type name
     * @return array Entity data
     */
    private function getEntityData(string $entity): array {
        $data = [];
        
        // Map entity names to mediator methods
        switch (strtolower(trim($entity))) {
            case 'clients':
                $collection = $this->mediator->getClients();
                break;
                
            case 'employees':
                $collection = $this->mediator->getEmployees();
                break;
                
            case 'agences':
                $collection = $this->mediator->getAgences();
                break;
                
            case 'fournisseurs':
                $collection = $this->mediator->getFournisseurs();
                break;
                
            case 'produits':
                $collection = $this->mediator->getProduits();
                break;
                
            case 'commandes':
                $collection = $this->mediator->getCommandes();
                break;
                
            case 'detailscommande':
                $collection = $this->mediator->getDetailsCommande();
                break;
                
            case 'factures':
                $collection = $this->mediator->getFactures();
                break;
                
            case 'livraisons':
                $collection = $this->mediator->getLivraisons();
                break;
                
            case 'approvisionnement':
                $collection = $this->mediator->getApprovisionnement();
                break;
                
            default:
                return [];
        }
        
        // Convert collection to array
        if (isset($collection)) {
            $data = $collection->getItems();
        }
        
        return $data;
    }
    
    /**
     * Apply filters to the data
     * 
     * @param array $data Data to filter
     * @param array $filters Filter conditions
     * @param array $parameters Query parameters
     * @return array Filtered data
     */
    private function applyFilters(array $data, array $filters, array $parameters): array {
        // Apply each filter
        foreach ($filters as $filter) {
            $field = $filter['field'];
            $operator = $filter['operator'];
            $value = $filter['value'];
            
            // Replace parameter placeholders
            if (substr($value, 0, 1) === ':') {
                $paramName = substr($value, 1);
                $value = $parameters[$paramName] ?? $value;
            }
            
            // Filter the data
            $data = array_filter($data, function($item) use ($field, $operator, $value) {
                // Handle field with entity prefix (entity.field)
                if (strpos($field, '.') !== false) {
                    list($entityPrefix, $actualField) = explode('.', $field, 2);
                    $fieldValue = $item->{$actualField} ?? null;
                } else {
                    $fieldValue = $item->{$field} ?? null;
                }
                
                // Apply the operator
                switch (strtoupper($operator)) {
                    case '=':
                        return $fieldValue == $value;
                    case '!=':
                        return $fieldValue != $value;
                    case '>':
                        return $fieldValue > $value;
                    case '<':
                        return $fieldValue < $value;
                    case '>=':
                        return $fieldValue >= $value;
                    case '<=':
                        return $fieldValue <= $value;
                    case 'LIKE':
                        return strpos($fieldValue, str_replace('%', '', $value)) !== false;
                    case 'IN':
                        $valueList = explode(',', $value);
                        return in_array($fieldValue, $valueList);
                    case 'NOT IN':
                        $valueList = explode(',', $value);
                        return !in_array($fieldValue, $valueList);
                    default:
                        return true;
                }
            });
        }
        
        return $data;
    }
    
    /**
     * Apply sorting to the data
     * 
     * @param array $data Data to sort
     * @param array $sortCriteria Sorting criteria
     * @return array Sorted data
     */
    private function applySorting(array $data, array $sortCriteria): array {
        usort($data, function($a, $b) use ($sortCriteria) {
            foreach ($sortCriteria as $sort) {
                $field = $sort['field'];
                $direction = $sort['direction'] ?? 'ASC';
                
                // Handle field with entity prefix
                if (strpos($field, '.') !== false) {
                    list($entityPrefix, $actualField) = explode('.', $field, 2);
                    $aValue = $a->{$actualField} ?? null;
                    $bValue = $b->{$actualField} ?? null;
                } else {
                    $aValue = $a->{$field} ?? null;
                    $bValue = $b->{$field} ?? null;
                }
                
                // Compare values
                if ($aValue == $bValue) {
                    continue; // Try the next sort field
                }
                
                $result = ($aValue < $bValue) ? -1 : 1;
                
                // Reverse for DESC order
                if ($direction === 'DESC') {
                    $result *= -1;
                }
                
                return $result;
            }
            
            return 0; // All values were equal
        });
        
        return $data;
    }
    
    /**
     * Join two datasets
     * 
     * @param array $leftData Left dataset
     * @param array $rightData Right dataset
     * @param string $leftKey Left key expression (entity.field)
     * @param string $rightKey Right key expression (entity.field)
     * @return array Joined data
     */
    private function joinData(array $leftData, array $rightData, string $leftKey, string $rightKey): array {
        $results = [];
        
        // Extract actual field names and entity prefixes
        list($leftEntity, $leftField) = explode('.', $leftKey, 2);
        list($rightEntity, $rightField) = explode('.', $rightKey, 2);
        
        foreach ($leftData as $leftItem) {
            // Get the value from the left item - try both with and without entity prefix
            $leftValue = null;
            if (isset($leftItem->{$leftField})) {
                $leftValue = $leftItem->{$leftField};
            } elseif (isset($leftItem->{$leftKey})) {
                $leftValue = $leftItem->{$leftKey};
            } elseif (isset($leftItem->{"{$leftEntity}_{$leftField}"})) {
                $leftValue = $leftItem->{"{$leftEntity}_{$leftField}"};
            }
            
            if ($leftValue === null) {
                continue; // Skip if we can't find the value
            }
            
            foreach ($rightData as $rightItem) {
                // Get the value from the right item - try both with and without entity prefix
                $rightValue = null;
                if (isset($rightItem->{$rightField})) {
                    $rightValue = $rightItem->{$rightField};
                } elseif (isset($rightItem->{$rightKey})) {
                    $rightValue = $rightItem->{$rightKey};
                } elseif (isset($rightItem->{"{$rightEntity}_{$rightField}"})) {
                    $rightValue = $rightItem->{"{$rightEntity}_{$rightField}"};
                }
                
                if ($rightValue === null) {
                    continue; // Skip if we can't find the value
                }
                
                // Handle string/numeric comparison correctly
                if ((string)$leftValue === (string)$rightValue) {
                    // Create a new object for the joined data
                    $mergedItem = new \stdClass();
                    
                    // Add all fields from the left item
                    foreach ((array)$leftItem as $field => $value) {
                        // Store original field name
                        $mergedItem->{$field} = $value;
                        // Add prefix for clarity when both datasets might have same field names
                        $prefixedField = $leftEntity . '_' . $field;
                        $mergedItem->{$prefixedField} = $value;
                    }
                    
                    // Add all fields from the right item
                    foreach ((array)$rightItem as $field => $value) {
                        // For fields that don't conflict with left item fields
                        if (!property_exists($mergedItem, $field)) {
                            $mergedItem->{$field} = $value;
                        }
                        // Always add the prefixed version
                        $prefixedField = $rightEntity . '_' . $field;
                        $mergedItem->{$prefixedField} = $value;
                    }
                    
                    $results[] = $mergedItem;
                }
            }
        }
        
        return $results;
    }
}
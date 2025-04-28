<?php
/**
 * Mediator.php
 * Mediator component that coordinates the data source adapters
 * and provides a unified view of the data
 */

namespace Integration\Mediator;

use Integration\Adapters\IAdapter;
use Integration\Common\ClientCollection;
use Integration\Common\EmployeeCollection;
use Integration\Common\AgenceCollection;
use Integration\Common\FournisseurCollection;
use Integration\Common\ProduitCollection;
use Integration\Common\CommandeCollection;
use Integration\Common\DetailCommandeCollection;
use Integration\Common\FactureCollection;
use Integration\Common\LivraisonCollection;
use Integration\Common\ApprovisionnementCollection;
use Integration\Common\ComplexQueryProcessor;

class Mediator {
    /**
     * @var IAdapter[] Array of adapter instances
     */
    private $adapters = [];
    
    /**
     * @var ComplexQueryProcessor Complex query processor instance
     */
    private $queryProcessor = null;
    
    /**
     * Add a data source adapter
     * 
     * @param IAdapter $adapter Adapter instance
     * @return Mediator For method chaining
     */
    public function addAdapter(IAdapter $adapter): Mediator {
        $this->adapters[] = $adapter;
        return $this;
    }
    
    /**
     * Initialize the complex query processor
     * 
     * @return Mediator For method chaining
     */
    public function initQueryProcessor(): Mediator {
        if ($this->queryProcessor === null) {
            $this->queryProcessor = new ComplexQueryProcessor($this);
        }
        return $this;
    }
    
    /**
     * Get the complex query processor instance
     * 
     * @return ComplexQueryProcessor|null The query processor instance or null if not initialized
     */
    public function getQueryProcessor(): ?ComplexQueryProcessor {
        return $this->queryProcessor;
    }
    
    /**
     * Execute a complex query
     * 
     * @param string $query The complex query string
     * @param array $parameters Optional parameters for the query
     * @return array The query results
     * @throws \Exception If query processor is not initialized
     */
    public function executeQuery(string $query, array $parameters = []): array {
        if ($this->queryProcessor === null) {
            throw new \Exception("Query processor not initialized. Call initQueryProcessor() first.");
        }
        return $this->queryProcessor->executeQuery($query, $parameters);
    }
    
    /**
     * Connect to all data sources
     * 
     * @return bool True if all connections successful, false otherwise
     */
    public function connect(): bool {
        $allConnected = true;
        
        foreach ($this->adapters as $adapter) {
            $connected = $adapter->connect();
            $allConnected = $allConnected && $connected;
        }
        
        return $allConnected;
    }
    
    /**
     * Disconnect from all data sources
     */
    public function disconnect() {
        foreach ($this->adapters as $adapter) {
            $adapter->disconnect();
        }
    }
    
    /**
     * Get clients from all data sources
     * 
     * @return ClientCollection Integrated client data
     */
    public function getClients(): ClientCollection {
        $result = new ClientCollection();
        
        foreach ($this->adapters as $adapter) {
            $clients = $adapter->getClients();
            $result->merge($clients);
        }
        
        return $result;
    }
    
    /**
     * Get employees from all data sources
     * 
     * @return EmployeeCollection Integrated employee data
     */
    public function getEmployees(): EmployeeCollection {
        $result = new EmployeeCollection();
        
        foreach ($this->adapters as $adapter) {
            $employees = $adapter->getEmployees();
            $result->merge($employees);
        }
        
        return $result;
    }
    
    /**
     * Get agencies from all data sources
     * 
     * @return AgenceCollection Integrated agency data
     */
    public function getAgences(): AgenceCollection {
        $result = new AgenceCollection();
        
        foreach ($this->adapters as $adapter) {
            $agences = $adapter->getAgences();
            $result->merge($agences);
        }
        
        return $result;
    }
    
    /**
     * Get suppliers from all data sources
     * 
     * @return FournisseurCollection Integrated supplier data
     */
    public function getFournisseurs(): FournisseurCollection {
        $result = new FournisseurCollection();
        
        foreach ($this->adapters as $adapter) {
            $fournisseurs = $adapter->getFournisseurs();
            $result->merge($fournisseurs);
        }
        
        return $result;
    }
    
    /**
     * Get products from all data sources
     * 
     * @return ProduitCollection Integrated product data
     */
    public function getProduits(): ProduitCollection {
        $result = new ProduitCollection();
        
        foreach ($this->adapters as $adapter) {
            $produits = $adapter->getProduits();
            $result->merge($produits);
        }
        
        return $result;
    }
    
    /**
     * Get orders from all data sources
     * 
     * @return CommandeCollection Integrated order data
     */
    public function getCommandes(): CommandeCollection {
        $result = new CommandeCollection();
        
        foreach ($this->adapters as $adapter) {
            $commandes = $adapter->getCommandes();
            $result->merge($commandes);
        }
        
        return $result;
    }
    
    /**
     * Get order details from all data sources
     * 
     * @return DetailCommandeCollection Integrated order detail data
     */
    public function getDetailsCommande(): DetailCommandeCollection {
        $result = new DetailCommandeCollection();
        
        foreach ($this->adapters as $adapter) {
            $details = $adapter->getDetailsCommande();
            $result->merge($details);
        }
        
        return $result;
    }
    
    /**
     * Get invoices from all data sources
     * 
     * @return FactureCollection Integrated invoice data
     */
    public function getFactures(): FactureCollection {
        $result = new FactureCollection();
        
        foreach ($this->adapters as $adapter) {
            $factures = $adapter->getFactures();
            $result->merge($factures);
        }
        
        return $result;
    }
    
    /**
     * Get deliveries from all data sources
     * 
     * @return LivraisonCollection Integrated delivery data
     */
    public function getLivraisons(): LivraisonCollection {
        $result = new LivraisonCollection();
        
        foreach ($this->adapters as $adapter) {
            $livraisons = $adapter->getLivraisons();
            $result->merge($livraisons);
        }
        
        return $result;
    }
    
    /**
     * Get supply data from all data sources
     * 
     * @return ApprovisionnementCollection Integrated supply data
     */
    public function getApprovisionnement(): ApprovisionnementCollection {
        $result = new ApprovisionnementCollection();
        
        foreach ($this->adapters as $adapter) {
            $approvisionnements = $adapter->getApprovisionnement();
            $result->merge($approvisionnements);
        }
        
        return $result;
    }
    
    /**
     * Search for clients by name
     * 
     * @param string $query Search query
     * @return ClientCollection Matching clients
     */
    public function searchClientsByName(string $query): ClientCollection {
        $allClients = $this->getClients();
        $result = new ClientCollection();
        
        foreach ($allClients->getItems() as $client) {
            if (stripos($client->nomComplet, $query) !== false) {
                $result->addItem($client);
            }
        }
        
        return $result;
    }
    
    /**
     * Get orders for a specific client
     * 
     * @param string $clientId Client ID (with prefix)
     * @return CommandeCollection Client's orders
     */
    public function getOrdersByClient(string $clientId): CommandeCollection {
        $allOrders = $this->getCommandes();
        $result = new CommandeCollection();
        
        foreach ($allOrders->getItems() as $order) {
            if ($order->clientRef === $clientId) {
                $result->addItem($order);
            }
        }
        
        return $result;
    }
    
    /**
     * Get order details for a specific order
     * 
     * @param string $orderId Order ID (with prefix)
     * @return DetailCommandeCollection Order details
     */
    public function getOrderDetails(string $orderId): DetailCommandeCollection {
        $allDetails = $this->getDetailsCommande();
        $result = new DetailCommandeCollection();
        
        foreach ($allDetails->getItems() as $detail) {
            if ($detail->commandeId === $orderId) {
                $result->addItem($detail);
            }
        }
        
        return $result;
    }
    
    /**
     * Get products supplied by a specific supplier
     * 
     * @param string $fournisseurId Supplier ID (with prefix)
     * @return ProduitCollection Products from this supplier
     */
    public function getProductsBySupplier(string $fournisseurId): ProduitCollection {
        $allApprovisionnements = $this->getApprovisionnement();
        $allProduits = $this->getProduits();
        $result = new ProduitCollection();
        $productIds = [];
        
        // First get all product IDs supplied by this supplier
        foreach ($allApprovisionnements->getItems() as $appro) {
            if ($appro->fournisseurId === $fournisseurId) {
                $productIds[] = $appro->produitId;
            }
        }
        
        // Then get the product details
        foreach ($allProduits->getItems() as $produit) {
            if (in_array($produit->id, $productIds)) {
                $result->addItem($produit);
            }
        }
        
        return $result;
    }
    
    /**
     * Get employees working at a specific agency
     * 
     * @param string $agenceId Agency ID (with prefix)
     * @return EmployeeCollection Employees at this agency
     */
    public function getEmployeesByAgency(string $agenceId): EmployeeCollection {
        $allEmployees = $this->getEmployees();
        $result = new EmployeeCollection();
        
        foreach ($allEmployees->getItems() as $employee) {
            if ($employee->agenceRef === $agenceId) {
                $result->addItem($employee);
            }
        }
        
        return $result;
    }

    /**
     * Validate data consistency across all sources
     * 
     * @return array Validation results with warnings and errors
     */
    public function validateDataConsistency(): array {
        $result = [
            'status' => true,
            'warnings' => [],
            'errors' => []
        ];
        
        // Validate client references in orders
        $this->validateReferences(
            $this->getCommandes(),
            $this->getClients(),
            'clientRef',
            'id',
            'Order with ID %s references non-existent client %s',
            $result
        );
        
        // Validate employee references in orders
        $this->validateReferences(
            $this->getCommandes(),
            $this->getEmployees(),
            'employeRef',
            'id',
            'Order with ID %s references non-existent employee %s',
            $result,
            true // Allow null references
        );
        
        // Validate order references in invoices
        $this->validateReferences(
            $this->getFactures(),
            $this->getCommandes(),
            'commandeRef',
            'id',
            'Invoice with ID %s references non-existent order %s',
            $result
        );
        
        // Validate order references in deliveries
        $this->validateReferences(
            $this->getLivraisons(),
            $this->getCommandes(),
            'commandeRef',
            'id',
            'Delivery with ID %s references non-existent order %s',
            $result
        );
        
        // Validate order references in order details
        $this->validateReferences(
            $this->getDetailsCommande(),
            $this->getCommandes(),
            'commandeId',
            'id',
            'Order detail references non-existent order %s',
            $result
        );
        
        // Validate product references in order details
        $this->validateReferences(
            $this->getDetailsCommande(),
            $this->getProduits(),
            'produitId',
            'id',
            'Order detail for order %s references non-existent product %s',
            $result
        );
        
        // Validate supplier references in products
        $this->validateReferences(
            $this->getApprovisionnement(),
            $this->getFournisseurs(),
            'fournisseurId',
            'id',
            'Supply record for product %s references non-existent supplier %s',
            $result
        );
        
        // Validate product references in supply records
        $this->validateReferences(
            $this->getApprovisionnement(),
            $this->getProduits(),
            'produitId',
            'id',
            'Supply record references non-existent product %s',
            $result
        );
        
        // Validate agency references in employees
        $this->validateReferences(
            $this->getEmployees(),
            $this->getAgences(),
            'agenceRef',
            'id',
            'Employee with ID %s references non-existent agency %s',
            $result,
            true // Allow null references
        );
        
        return $result;
    }
    
    /**
     * Helper method to validate references between collections
     * 
     * @param object $sourceCollection Collection with references
     * @param object $targetCollection Collection being referenced
     * @param string $sourceField Field in source containing reference
     * @param string $targetField Field in target to match reference against
     * @param string $errorMsg Error message format (with %s placeholders)
     * @param array &$result Results array to append errors/warnings to
     * @param bool $allowNull Whether null references are allowed
     */
    private function validateReferences($sourceCollection, $targetCollection, $sourceField, $targetField, $errorMsg, array &$result, bool $allowNull = false) {
        // Build an array of all target IDs for faster lookups
        $targetIds = [];
        foreach ($targetCollection->getItems() as $target) {
            $targetIds[$target->$targetField] = true;
        }
        
        // Check each source item's reference
        foreach ($sourceCollection->getItems() as $source) {
            $refValue = $source->$sourceField;
            
            // Skip null references if they're allowed
            if ($allowNull && $refValue === null) {
                continue;
            }
            
            if (!isset($targetIds[$refValue])) {
                // Reference not found in target collection
                if ($sourceField === 'commandeId' || $sourceField === 'produitId' || $sourceField === 'fournisseurId') {
                    // For these fields, we use a different error message format
                    $result['warnings'][] = sprintf($errorMsg, $refValue);
                } else {
                    $result['warnings'][] = sprintf($errorMsg, $source->id ?? 'unknown', $refValue);
                }
                $result['status'] = false;
            }
        }
    }
    
    /**
     * Get data statistics for all sources
     * 
     * @return array Statistics about the integrated data
     */
    public function getDataStatistics(): array {
        // Get counts by source system
        $stats = [
            'overall' => [
                'clients' => $this->getClients()->count(),
                'employees' => $this->getEmployees()->count(),
                'agencies' => $this->getAgences()->count(),
                'suppliers' => $this->getFournisseurs()->count(),
                'products' => $this->getProduits()->count(),
                'orders' => $this->getCommandes()->count(),
                'orderDetails' => $this->getDetailsCommande()->count(),
                'invoices' => $this->getFactures()->count(),
                'deliveries' => $this->getLivraisons()->count(),
                'supplyRecords' => $this->getApprovisionnement()->count()
            ],
            'bySource' => []
        ];
        
        // Get the unique source systems
        $sources = [];
        foreach ($this->adapters as $adapter) {
            $sources[$adapter->getSourceSystem()] = true;
        }
        
        // Initialize counters for each source
        foreach (array_keys($sources) as $source) {
            $stats['bySource'][$source] = array_map(function($v) { return 0; }, $stats['overall']);
        }
        
        // Count items by source system
        $this->countBySource($this->getClients(), 'clients', $stats['bySource']);
        $this->countBySource($this->getEmployees(), 'employees', $stats['bySource']);
        $this->countBySource($this->getAgences(), 'agencies', $stats['bySource']);
        $this->countBySource($this->getFournisseurs(), 'suppliers', $stats['bySource']);
        $this->countBySource($this->getProduits(), 'products', $stats['bySource']);
        $this->countBySource($this->getCommandes(), 'orders', $stats['bySource']);
        $this->countBySource($this->getDetailsCommande(), 'orderDetails', $stats['bySource']);
        $this->countBySource($this->getFactures(), 'invoices', $stats['bySource']);
        $this->countBySource($this->getLivraisons(), 'deliveries', $stats['bySource']);
        $this->countBySource($this->getApprovisionnement(), 'supplyRecords', $stats['bySource']);
        
        return $stats;
    }
    
    /**
     * Helper method to count items by source system
     * 
     * @param object $collection Data collection
     * @param string $key Stats key to update
     * @param array &$stats Stats array to update
     */
    private function countBySource($collection, $key, array &$stats) {
        foreach ($collection->getItems() as $item) {
            if (isset($stats[$item->sourceSystem][$key])) {
                $stats[$item->sourceSystem][$key]++;
            }
        }
    }
    
    /**
     * Find possible duplicate clients across data sources
     * 
     * @return array List of potential duplicate clients
     */
    public function findPotentialDuplicateClients(): array {
        $clients = $this->getClients()->getItems();
        $potentialDuplicates = [];
        
        // Compare each client with every other client
        for ($i = 0; $i < count($clients); $i++) {
            for ($j = $i + 1; $j < count($clients); $j++) {
                $client1 = $clients[$i];
                $client2 = $clients[$j];
                
                // Skip if from the same source system (internal duplicates should be handled by the source systems)
                if ($client1->sourceSystem === $client2->sourceSystem) {
                    continue;
                }
                
                // Check for similarity in name
                $nameSimilarity = $this->calculateStringSimilarity(
                    $this->normalizeString($client1->nomComplet),
                    $this->normalizeString($client2->nomComplet)
                );
                
                // Check for exact email match if available
                $emailMatch = false;
                if (!empty($client1->emailContact) && !empty($client2->emailContact)) {
                    $emailMatch = strtolower($client1->emailContact) === strtolower($client2->emailContact);
                }
                
                // Check for phone match if available
                $phoneMatch = false;
                if (!empty($client1->numeroTelephone) && !empty($client2->numeroTelephone)) {
                    $phone1 = preg_replace('/[^0-9]/', '', $client1->numeroTelephone);
                    $phone2 = preg_replace('/[^0-9]/', '', $client2->numeroTelephone);
                    $phoneMatch = $phone1 === $phone2 && !empty($phone1);
                }
                
                // Consider as potential duplicate if name is very similar or email/phone matches
                if ($nameSimilarity > 0.8 || $emailMatch || $phoneMatch) {
                    $potentialDuplicates[] = [
                        'client1' => $client1,
                        'client2' => $client2,
                        'nameSimilarity' => $nameSimilarity,
                        'emailMatch' => $emailMatch,
                        'phoneMatch' => $phoneMatch,
                        'confidenceScore' => $this->calculateConfidenceScore($nameSimilarity, $emailMatch, $phoneMatch)
                    ];
                }
            }
        }
        
        // Sort by confidence score (descending)
        usort($potentialDuplicates, function($a, $b) {
            return $b['confidenceScore'] <=> $a['confidenceScore'];
        });
        
        return $potentialDuplicates;
    }
    
    /**
     * Calculate string similarity using Levenshtein distance
     * 
     * @param string $str1 First string
     * @param string $str2 Second string
     * @return float Similarity score (0-1)
     */
    private function calculateStringSimilarity(string $str1, string $str2): float {
        if (empty($str1) && empty($str2)) {
            return 1.0; // Both empty means they're identical
        }
        
        if (empty($str1) || empty($str2)) {
            return 0.0; // One empty and one not means completely different
        }
        
        $levDistance = levenshtein($str1, $str2);
        $maxLen = max(strlen($str1), strlen($str2));
        
        // Convert to similarity score (0-1)
        return 1 - ($levDistance / $maxLen);
    }
    
    /**
     * Normalize a string for comparison
     * 
     * @param string $str Input string
     * @return string Normalized string
     */
    private function normalizeString(string $str): string {
        // Convert to lowercase
        $str = mb_strtolower($str);
        // Remove extra whitespace
        $str = preg_replace('/\s+/', ' ', trim($str));
        // Remove accents
        $str = $this->removeAccents($str);
        
        return $str;
    }
    
    /**
     * Remove accents from a string
     * 
     * @param string $str Input string
     * @return string String without accents
     */
    private function removeAccents(string $str): string {
        if (!function_exists('transliterator_transliterate')) {
            // Fallback if intl extension is not available
            $unwanted_chars = [
                'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a',
                'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
                'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
                'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
                'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
                'ç' => 'c', 'ñ' => 'n'
            ];
            return strtr($str, $unwanted_chars);
        }
        
        return transliterator_transliterate('Any-Latin; Latin-ASCII', $str);
    }
    
    /**
     * Calculate confidence score for duplicate detection
     * 
     * @param float $nameSimilarity Name similarity score (0-1)
     * @param bool $emailMatch True if emails match
     * @param bool $phoneMatch True if phones match
     * @return float Confidence score (0-1)
     */
    private function calculateConfidenceScore(float $nameSimilarity, bool $emailMatch, bool $phoneMatch): float {
        // Email is stronger indicator than phone, which is stronger than name similarity
        $score = $nameSimilarity * 0.5; // Name contributes 50% max
        
        if ($emailMatch) {
            $score += 0.3; // Email match adds 30%
        }
        
        if ($phoneMatch) {
            $score += 0.2; // Phone match adds 20%
        }
        
        return min(1.0, $score); // Ensure score doesn't exceed 1
    }

    /**
     * Analyze order history and trends
     * 
     * @param string $startDate Optional start date in YYYY-MM-DD format
     * @param string $endDate Optional end date in YYYY-MM-DD format
     * @return array Order analytics data
     */
    public function analyzeOrders(?string $startDate = null, ?string $endDate = null): array {
        $orders = $this->getCommandes()->getItems();
        $orderDetails = $this->getDetailsCommande()->getItems();
        
        // Filter orders by date range if specified
        if ($startDate !== null || $endDate !== null) {
            $filtered = [];
            foreach ($orders as $order) {
                $orderDate = new \DateTime($order->dateCommande);
                
                if ($startDate !== null) {
                    $start = new \DateTime($startDate);
                    if ($orderDate < $start) {
                        continue;
                    }
                }
                
                if ($endDate !== null) {
                    $end = new \DateTime($endDate);
                    if ($orderDate > $end) {
                        continue;
                    }
                }
                
                $filtered[] = $order;
            }
            $orders = $filtered;
        }
        
        // Initialize analytics structure
        $analytics = [
            'totalOrders' => count($orders),
            'totalRevenue' => 0,
            'averageOrderValue' => 0,
            'ordersBySource' => [],
            'ordersByMonth' => [],
            'topProducts' => [],
            'topClients' => [],
        ];
        
        // Group products by ID for faster lookup
        $productQuantities = [];
        $orderTotals = [];
        $clientOrders = [];
        
        // Calculate order values and collect product quantities
        foreach ($orders as $order) {
            $source = $order->sourceSystem;
            $orderMonth = date('Y-m', strtotime($order->dateCommande));
            $orderId = $order->id;
            $clientId = $order->clientRef;
            
            // Initialize arrays if needed
            if (!isset($analytics['ordersBySource'][$source])) {
                $analytics['ordersBySource'][$source] = 0;
            }
            if (!isset($analytics['ordersByMonth'][$orderMonth])) {
                $analytics['ordersByMonth'][$orderMonth] = [
                    'count' => 0,
                    'revenue' => 0
                ];
            }
            if (!isset($clientOrders[$clientId])) {
                $clientOrders[$clientId] = [
                    'count' => 0,
                    'total' => 0
                ];
            }
            
            // Increment counters
            $analytics['ordersBySource'][$source]++;
            $analytics['ordersByMonth'][$orderMonth]['count']++;
            $clientOrders[$clientId]['count']++;
            
            // Calculate order total
            $orderTotal = 0;
            foreach ($orderDetails as $detail) {
                if ($detail->commandeId === $orderId) {
                    $lineTotal = $detail->quantite * $detail->prixUnitaire;
                    $orderTotal += $lineTotal;
                    
                    // Track product quantities
                    $productId = $detail->produitId;
                    if (!isset($productQuantities[$productId])) {
                        $productQuantities[$productId] = [
                            'quantity' => 0,
                            'revenue' => 0
                        ];
                    }
                    $productQuantities[$productId]['quantity'] += $detail->quantite;
                    $productQuantities[$productId]['revenue'] += $lineTotal;
                }
            }
            
            // Update totals
            $analytics['totalRevenue'] += $orderTotal;
            $analytics['ordersByMonth'][$orderMonth]['revenue'] += $orderTotal;
            $orderTotals[$orderId] = $orderTotal;
            $clientOrders[$clientId]['total'] += $orderTotal;
        }
        
        // Calculate average order value
        if ($analytics['totalOrders'] > 0) {
            $analytics['averageOrderValue'] = $analytics['totalRevenue'] / $analytics['totalOrders'];
        }
        
        // Sort product quantities to get top products
        arsort($productQuantities);
        $products = $this->getProduits()->getItems();
        $productMap = [];
        foreach ($products as $product) {
            $productMap[$product->id] = $product;
        }
        
        // Get top 10 products
        $count = 0;
        foreach ($productQuantities as $productId => $data) {
            if ($count++ >= 10) break;
            
            $productName = isset($productMap[$productId]) ? $productMap[$productId]->libelle : "Unknown Product";
            $analytics['topProducts'][] = [
                'id' => $productId,
                'name' => $productName,
                'quantitySold' => $data['quantity'],
                'revenue' => $data['revenue']
            ];
        }
        
        // Sort clients to get top clients
        uasort($clientOrders, function($a, $b) {
            return $b['total'] <=> $a['total']; // Sort by total revenue descending
        });
        
        // Get client names
        $clients = $this->getClients()->getItems();
        $clientMap = [];
        foreach ($clients as $client) {
            $clientMap[$client->id] = $client;
        }
        
        // Get top 10 clients
        $count = 0;
        foreach ($clientOrders as $clientId => $data) {
            if ($count++ >= 10) break;
            
            $clientName = isset($clientMap[$clientId]) ? $clientMap[$clientId]->nomComplet : "Unknown Client";
            $analytics['topClients'][] = [
                'id' => $clientId,
                'name' => $clientName,
                'orderCount' => $data['count'],
                'totalSpent' => $data['total']
            ];
        }
        
        // Sort months chronologically
        ksort($analytics['ordersByMonth']);
        
        return $analytics;
    }
    
    /**
     * Analyze product inventory and sales
     * 
     * @return array Product analytics data
     */
    public function analyzeProducts(): array {
        $products = $this->getProduits()->getItems();
        $orderDetails = $this->getDetailsCommande()->getItems();
        $approvisionnements = $this->getApprovisionnement()->getItems();
        
        // Initialize analytics structure
        $analytics = [
            'totalProducts' => count($products),
            'productsByCategory' => [],
            'productsBySource' => [],
            'inventoryValue' => 0,
            'lowStockProducts' => [],
            'noSalesProducts' => [],
            'topSellingCategories' => [],
            'productPriceDistribution' => [
                'min' => PHP_FLOAT_MAX,
                'max' => 0,
                'avg' => 0,
                'ranges' => [
                    '0-10' => 0,
                    '10-50' => 0,
                    '50-100' => 0,
                    '100-500' => 0,
                    '500+' => 0
                ]
            ]
        ];
        
        // Calculate total sales quantity by product
        $productSales = [];
        foreach ($orderDetails as $detail) {
            $productId = $detail->produitId;
            if (!isset($productSales[$productId])) {
                $productSales[$productId] = 0;
            }
            $productSales[$productId] += $detail->quantite;
        }
        
        // Calculate categories and inventory value
        $categories = [];
        $totalValue = 0;
        
        foreach ($products as $product) {
            $productId = $product->id;
            $source = $product->sourceSystem;
            $category = $product->categorie ?? 'Uncategorized';
            $price = $product->prixUnitaire ?? 0;
            $stock = $product->stockActuel ?? 0;
            
            // Increment source counter
            if (!isset($analytics['productsBySource'][$source])) {
                $analytics['productsBySource'][$source] = 0;
            }
            $analytics['productsBySource'][$source]++;
            
            // Increment category counter
            if (!isset($analytics['productsByCategory'][$category])) {
                $analytics['productsByCategory'][$category] = 0;
                $categories[$category] = [
                    'salesCount' => 0,
                    'salesValue' => 0
                ];
            }
            $analytics['productsByCategory'][$category]++;
            
            // Add to inventory value
            $productValue = $price * $stock;
            $totalValue += $productValue;
            
            // Check for low stock
            if ($stock <= 10) {
                $analytics['lowStockProducts'][] = [
                    'id' => $productId,
                    'name' => $product->libelle,
                    'currentStock' => $stock,
                    'recentSales' => $productSales[$productId] ?? 0
                ];
            }
            
            // Check for no sales
            if (!isset($productSales[$productId]) || $productSales[$productId] === 0) {
                $analytics['noSalesProducts'][] = [
                    'id' => $productId,
                    'name' => $product->libelle,
                    'currentStock' => $stock,
                    'daysInStock' => $this->getProductAgeInDays($productId, $approvisionnements)
                ];
            } else {
                // Update category sales data
                $categories[$category]['salesCount'] += $productSales[$productId];
                $categories[$category]['salesValue'] += $productSales[$productId] * $price;
            }
            
            // Update price distribution
            $analytics['productPriceDistribution']['min'] = min($analytics['productPriceDistribution']['min'], $price);
            $analytics['productPriceDistribution']['max'] = max($analytics['productPriceDistribution']['max'], $price);
            
            // Increment price range counter
            if ($price < 10) {
                $analytics['productPriceDistribution']['ranges']['0-10']++;
            } elseif ($price < 50) {
                $analytics['productPriceDistribution']['ranges']['10-50']++;
            } elseif ($price < 100) {
                $analytics['productPriceDistribution']['ranges']['50-100']++;
            } elseif ($price < 500) {
                $analytics['productPriceDistribution']['ranges']['100-500']++;
            } else {
                $analytics['productPriceDistribution']['ranges']['500+']++;
            }
        }
        
        // Set inventory value
        $analytics['inventoryValue'] = $totalValue;
        
        // Calculate average price
        if ($analytics['totalProducts'] > 0) {
            $totalPrice = 0;
            foreach ($products as $product) {
                $totalPrice += ($product->prixUnitaire ?? 0);
            }
            $analytics['productPriceDistribution']['avg'] = $totalPrice / $analytics['totalProducts'];
        }
        
        // Get top selling categories
        uasort($categories, function($a, $b) {
            return $b['salesValue'] <=> $a['salesValue']; // Sort by sales value descending
        });
        
        foreach ($categories as $category => $data) {
            $analytics['topSellingCategories'][] = [
                'category' => $category,
                'salesCount' => $data['salesCount'],
                'salesValue' => $data['salesValue']
            ];
            
            if (count($analytics['topSellingCategories']) >= 5) {
                break; // Keep only top 5
            }
        }
        
        return $analytics;
    }
    
    /**
     * Analyze customer activity and segmentation
     * 
     * @return array Customer analytics data
     */
    public function analyzeCustomers(): array {
        $clients = $this->getClients()->getItems();
        $orders = $this->getCommandes()->getItems();
        $orderDetails = $this->getDetailsCommande()->getItems();
        
        // Initialize analytics structure
        $analytics = [
            'totalCustomers' => count($clients),
            'customersBySource' => [],
            'customersByRegion' => [],
            'newCustomers30Days' => 0,
            'customerSegments' => [
                'vip' => [],
                'active' => [],
                'occasional' => [],
                'inactive' => []
            ],
            'customerRetention' => [
                'repeat' => 0,
                'oneTime' => 0,
                'retentionRate' => 0
            ]
        ];
        
        // Calculate customer metrics
        $customerOrders = [];
        $customerFirstOrder = [];
        $customerLastOrder = [];
        $customerTotalSpend = [];
        
        // Group orders by customer
        foreach ($orders as $order) {
            $clientId = $order->clientRef;
            $orderDate = new \DateTime($order->dateCommande);
            
            if (!isset($customerOrders[$clientId])) {
                $customerOrders[$clientId] = 0;
                $customerFirstOrder[$clientId] = $orderDate;
                $customerLastOrder[$clientId] = $orderDate;
                $customerTotalSpend[$clientId] = 0;
            }
            
            $customerOrders[$clientId]++;
            
            if ($orderDate < $customerFirstOrder[$clientId]) {
                $customerFirstOrder[$clientId] = $orderDate;
            }
            
            if ($orderDate > $customerLastOrder[$clientId]) {
                $customerLastOrder[$clientId] = $orderDate;
            }
            
            // Calculate order total
            $orderTotal = 0;
            $orderId = $order->id;
            
            foreach ($orderDetails as $detail) {
                if ($detail->commandeId === $orderId) {
                    $lineTotal = $detail->quantite * $detail->prixUnitaire;
                    $orderTotal += $lineTotal;
                }
            }
            
            $customerTotalSpend[$clientId] += $orderTotal;
        }
        
        // Get current date for recency calculations
        $now = new \DateTime();
        $thirtyDaysAgo = new \DateTime('-30 days');
        $sixMonthsAgo = new \DateTime('-6 months');
        $twelveMonthsAgo = new \DateTime('-12 months');
        
        // Process each customer
        foreach ($clients as $client) {
            $clientId = $client->id;
            $source = $client->sourceSystem;
            $region = $client->region ?? $client->ville ?? 'Unknown';
            
            // Increment source counter
            if (!isset($analytics['customersBySource'][$source])) {
                $analytics['customersBySource'][$source] = 0;
            }
            $analytics['customersBySource'][$source]++;
            
            // Increment region counter
            if (!isset($analytics['customersByRegion'][$region])) {
                $analytics['customersByRegion'][$region] = 0;
            }
            $analytics['customersByRegion'][$region]++;
            
            // Check if new customer (first order in last 30 days)
            if (isset($customerFirstOrder[$clientId]) && $customerFirstOrder[$clientId] > $thirtyDaysAgo) {
                $analytics['newCustomers30Days']++;
            }
            
            // Skip further analysis if customer has no orders
            if (!isset($customerOrders[$clientId])) {
                // No orders, consider inactive
                $analytics['customerSegments']['inactive'][] = [
                    'id' => $clientId,
                    'name' => $client->nomComplet,
                    'orders' => 0,
                    'totalSpend' => 0,
                    'daysSinceLastOrder' => null
                ];
                continue;
            }
            
            // Calculate days since last order
            $daysSinceLastOrder = $now->diff($customerLastOrder[$clientId])->days;
            $totalSpend = $customerTotalSpend[$clientId] ?? 0;
            $orderCount = $customerOrders[$clientId];
            
            // Segment customers
            $customerData = [
                'id' => $clientId,
                'name' => $client->nomComplet,
                'orders' => $orderCount,
                'totalSpend' => $totalSpend,
                'daysSinceLastOrder' => $daysSinceLastOrder
            ];
            
            if ($totalSpend > 5000 && $orderCount >= 5) {
                $analytics['customerSegments']['vip'][] = $customerData;
            } elseif ($daysSinceLastOrder <= 180) { // Active: ordered within 6 months
                $analytics['customerSegments']['active'][] = $customerData;
            } elseif ($daysSinceLastOrder <= 365) { // Occasional: ordered within a year
                $analytics['customerSegments']['occasional'][] = $customerData;
            } else {
                $analytics['customerSegments']['inactive'][] = $customerData; // Inactive: no orders for over a year
            }
            
            // Calculate retention metrics
            if ($orderCount > 1) {
                $analytics['customerRetention']['repeat']++;
            } else {
                $analytics['customerRetention']['oneTime']++;
            }
        }
        
        // Calculate retention rate
        $totalCustomersWithOrders = $analytics['customerRetention']['repeat'] + $analytics['customerRetention']['oneTime'];
        if ($totalCustomersWithOrders > 0) {
            $analytics['customerRetention']['retentionRate'] = 
                ($analytics['customerRetention']['repeat'] / $totalCustomersWithOrders) * 100;
        }
        
        // Sort segments by total spend
        foreach (array_keys($analytics['customerSegments']) as $segment) {
            usort($analytics['customerSegments'][$segment], function($a, $b) {
                return $b['totalSpend'] <=> $a['totalSpend']; // Sort by total spend descending
            });
            
            // Limit to top 10 customers per segment
            if (count($analytics['customerSegments'][$segment]) > 10) {
                $analytics['customerSegments'][$segment] = array_slice($analytics['customerSegments'][$segment], 0, 10);
            }
        }
        
        return $analytics;
    }
    
    /**
     * Get age of a product in days since first supply record
     * 
     * @param string $productId Product ID
     * @param array $approvisionnements Supply records
     * @return int|null Age in days or null if no supply records
     */
    private function getProductAgeInDays(string $productId, array $approvisionnements): ?int {
        $firstSupply = null;
        
        foreach ($approvisionnements as $appro) {
            if ($appro->produitId === $productId && !empty($appro->dateApprovisionnement)) {
                $supplyDate = new \DateTime($appro->dateApprovisionnement);
                
                if ($firstSupply === null || $supplyDate < $firstSupply) {
                    $firstSupply = $supplyDate;
                }
            }
        }
        
        if ($firstSupply === null) {
            return null;
        }
        
        $now = new \DateTime();
        return $now->diff($firstSupply)->days;
    }
    
    /**
     * Get summary of all data sources and their status
     * 
     * @return array Data source summary
     */
    public function getSourceSummary(): array {
        $summary = [];
        
        foreach ($this->adapters as $index => $adapter) {
            $sourceSystem = $adapter->getSourceSystem();
            $connected = $adapter->isConnected();
            
            $sourceData = [
                'id' => $index + 1,
                'name' => $sourceSystem,
                'type' => get_class($adapter),
                'connected' => $connected,
                'entityCounts' => []
            ];
            
            // Only try to get counts if connected
            if ($connected) {
                try {
                    $sourceData['entityCounts'] = [
                        'clients' => count($adapter->getClients()->getItems()),
                        'employees' => count($adapter->getEmployees()->getItems()),
                        'agencies' => count($adapter->getAgences()->getItems()),
                        'suppliers' => count($adapter->getFournisseurs()->getItems()),
                        'products' => count($adapter->getProduits()->getItems()),
                        'orders' => count($adapter->getCommandes()->getItems())
                    ];
                } catch (\Exception $e) {
                    $sourceData['error'] = $e->getMessage();
                }
            }
            
            $summary[] = $sourceData;
        }
        
        return $summary;
    }
    
    /**
     * Check for data quality issues across all sources
     * 
     * @return array Data quality report
     */
    public function checkDataQuality(): array {
        $report = [
            'missingValues' => [],
            'outOfRangeValues' => [],
            'inconsistentFormats' => [],
            'duplicateRecords' => [],
            'overallScore' => 100  // Start with perfect score and deduct points
        ];
        
        // Check client data
        $this->checkEntityQuality(
            $this->getClients()->getItems(),
            ['nomComplet', 'emailContact', 'adresse'],
            $report
        );
        
        // Check product data
        $this->checkEntityQuality(
            $this->getProduits()->getItems(),
            ['libelle', 'prixUnitaire', 'stockActuel'],
            $report,
            ['prixUnitaire' => ['min' => 0, 'max' => 10000], 'stockActuel' => ['min' => 0, 'max' => 100000]]
        );
        
        // Check order data
        $this->checkEntityQuality(
            $this->getCommandes()->getItems(),
            ['dateCommande', 'clientRef'],
            $report
        );
        
        // Check for duplicate customer records
        $potentialDuplicates = $this->findPotentialDuplicateClients();
        if (count($potentialDuplicates) > 0) {
            foreach ($potentialDuplicates as $duplicate) {
                if ($duplicate['confidenceScore'] > 0.9) {
                    $report['duplicateRecords'][] = [
                        'entity' => 'client',
                        'record1' => $duplicate['client1']->id . ' (' . $duplicate['client1']->nomComplet . ')',
                        'record2' => $duplicate['client2']->id . ' (' . $duplicate['client2']->nomComplet . ')',
                        'confidenceScore' => $duplicate['confidenceScore']
                    ];
                    
                    // Deduct points for high-confidence duplicates
                    $report['overallScore'] -= 2;
                }
            }
        }
        
        // Cap the score at 0 (minimum)
        $report['overallScore'] = max(0, $report['overallScore']);
        
        return $report;
    }
    
    /**
     * Helper to check entity quality
     * 
     * @param array $entities List of entity objects
     * @param array $requiredFields List of required fields
     * @param array &$report Report to update
     * @param array $rangeChecks Optional range checks for numeric fields
     */
    private function checkEntityQuality(array $entities, array $requiredFields, array &$report, array $rangeChecks = []) {
        $entityType = $this->getEntityType($entities);
        
        foreach ($entities as $entity) {
            // Check for missing required fields
            foreach ($requiredFields as $field) {
                if (empty($entity->$field)) {
                    $report['missingValues'][] = [
                        'entity' => $entityType,
                        'id' => $entity->id,
                        'field' => $field,
                        'source' => $entity->sourceSystem
                    ];
                    
                    $report['overallScore'] -= 0.5;
                }
            }
            
            // Check for out of range values
            foreach ($rangeChecks as $field => $range) {
                if (isset($entity->$field) && is_numeric($entity->$field)) {
                    if ($entity->$field < $range['min'] || $entity->$field > $range['max']) {
                        $report['outOfRangeValues'][] = [
                            'entity' => $entityType,
                            'id' => $entity->id,
                            'field' => $field,
                            'value' => $entity->$field,
                            'expectedRange' => $range['min'] . ' - ' . $range['max'],
                            'source' => $entity->sourceSystem
                        ];
                        
                        $report['overallScore'] -= 1;
                    }
                }
            }
            
            // Check for email format if field exists
            if (isset($entity->emailContact) && !empty($entity->emailContact)) {
                if (!filter_var($entity->emailContact, FILTER_VALIDATE_EMAIL)) {
                    $report['inconsistentFormats'][] = [
                        'entity' => $entityType,
                        'id' => $entity->id,
                        'field' => 'emailContact',
                        'value' => $entity->emailContact,
                        'expectedFormat' => 'valid email address',
                        'source' => $entity->sourceSystem
                    ];
                    
                    $report['overallScore'] -= 1;
                }
            }
            
            // Check for date format if field exists and contains 'date'
            foreach (get_object_vars($entity) as $field => $value) {
                if (strpos(strtolower($field), 'date') !== false && !empty($value)) {
                    try {
                        new \DateTime($value);
                    } catch (\Exception $e) {
                        $report['inconsistentFormats'][] = [
                            'entity' => $entityType,
                            'id' => $entity->id,
                            'field' => $field,
                            'value' => $value,
                            'expectedFormat' => 'valid date',
                            'source' => $entity->sourceSystem
                        ];
                        
                        $report['overallScore'] -= 1;
                    }
                }
            }
        }
    }
    
    /**
     * Try to determine entity type from an array of entities
     * 
     * @param array $entities Array of entity objects
     * @return string Entity type name
     */
    private function getEntityType(array $entities): string {
        if (count($entities) === 0) {
            return 'unknown';
        }
        
        $entity = $entities[0];
        
        // Try to determine type by properties
        if (isset($entity->nomComplet)) {
            return 'client';
        }
        
        if (isset($entity->libelle) && isset($entity->prixUnitaire)) {
            return 'product';
        }
        
        if (isset($entity->dateCommande)) {
            return 'order';
        }
        
        if (isset($entity->commandeId) && isset($entity->produitId)) {
            return 'orderDetail';
        }
        
        // Return class name if we can't determine by properties
        return get_class($entity);
    }
    
    /**
     * Initialize the complex query processor
     * 
     * @return ComplexQueryProcessor The initialized processor
     */
    public function initializeQueryProcessor(): ComplexQueryProcessor {
        if ($this->queryProcessor === null) {
            $this->queryProcessor = new ComplexQueryProcessor($this);
        }
        return $this->queryProcessor;
    }
    
    /**
     * Execute a complex query
     * 
     * @param string $query The query string
     * @param array $parameters Optional parameters for the query
     * @return array The query results
     */
    public function executeComplexQuery(string $query, array $parameters = []): array {
        $processor = $this->initializeQueryProcessor();
        return $processor->executeQuery($query, $parameters);
    }
}
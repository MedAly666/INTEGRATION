# Data Integration System

This system integrates data from multiple heterogeneous data sources (SQL, XML, Neo4j) and provides a unified view through a REST API and SQL interface.

## Features

- REST API for accessing integrated data
- SQL query interface for direct querying of the global schema
- Data consistency validation
- Duplicate detection
- Statistics on integrated data

## Architecture

The system follows a mediator pattern with the following components:

- **Adapters**: Connect to specific data sources and transform their data to the common model
  - `SQLAdapter`: Connects to SQL databases
  - `XMLAdapter`: Reads data from XML files
  
- **Mediator**: Coordinates between adapters and provides a unified interface for clients

- **Common Data Model**: Defines the structure of the integrated data
  - Client, Employee, Agence, Fournisseur, Produit, etc.
  
- **Query Processor**: Handles complex queries across multiple data sources
  - Supports predefined queries and simple custom queries

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/): A fast JavaScript runtime and package manager
- TypeScript knowledge
- Data sources (SQL database, XML files)

### Installation

1. Clone this repository
2. Install dependencies:

```bash
bun install
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
SQL_HOST=localhost
SQL_USER=username
SQL_PASSWORD=password
SQL_DATABASE=database
XML_FILE=/path/to/your/xml/file.xml
```

### Running the Application

- **Development Mode** (with hot-reloading):

```bash
bun run dev
```

- **Production Mode**:

```bash
bun run start
```

- **Build for Deployment**:

```bash
bun run build
```

## API Endpoints

The system provides several REST API endpoints to access the integrated data:

- `GET /api/clients` - Get all clients
- `GET /api/employees` - Get all employees
- `GET /api/agences` - Get all agencies
- `GET /api/fournisseurs` - Get all suppliers
- `GET /api/produits` - Get all products
- `GET /api/commandes` - Get all orders
- `GET /api/details-commande` - Get all order details
- `GET /api/search/clients?q=query` - Search clients by name
- `GET /api/clients/{clientId}/commandes` - Get orders for a client
- `GET /api/commandes/{orderId}/details` - Get details for an order
- `GET /api/statistics` - Get data statistics
- `GET /api/validate` - Validate data consistency
- `GET /api/duplicates/clients` - Find potential duplicate clients
- `POST /api/query` - Execute a custom query

## SQL Query Interface

The system now includes a powerful SQL query interface that allows you to execute arbitrary SQL queries against the global schema. This feature enables complex data analysis across all integrated data sources with a single query.

### Accessing the SQL Interface

1. Start the application
2. Navigate to http://localhost:3000 in your browser
3. Click on "Open SQL Query Interface" or navigate directly to http://localhost:3000/sql-interface

### Example Queries

The SQL interface includes several example queries to help you get started. Some examples of what you can do:

```sql
-- Basic query to retrieve all clients
SELECT * FROM clients LIMIT 10;

-- Find orders by client name
SELECT * FROM clients WHERE nom_complet LIKE "%Smith%";

-- Join clients with their orders
SELECT c.nom_complet, c.email_contact, o.date_commande, o.statut
FROM commandes o
JOIN clients c ON o.client_ref = c.id
LIMIT 20;

-- Analyze products by category
SELECT categorie, COUNT(*) as product_count
FROM produits
GROUP BY categorie
ORDER BY product_count DESC;

-- Find top-selling products
SELECT p.id, p.libelle, SUM(d.quantite) as total_ordered
FROM details_commande d
JOIN produits p ON d.produit_id = p.id
GROUP BY p.id, p.libelle
ORDER BY total_ordered DESC
LIMIT 10;
```

### Global Schema

The system exposes the following tables through the global schema:

- `clients` - Client information
- `employees` - Employee information
- `agences` - Agency information
- `fournisseurs` - Supplier information
- `produits` - Product information
- `commandes` - Order information
- `details_commande` - Order details
- `factures` - Invoice information
- `livraisons` - Delivery information
- `approvisionnement` - Supply information

## Customizing and Extending

### Adding a New Data Source

1. Create a new adapter class that implements `IAdapter` interface
2. Implement all the required methods to connect to the data source and retrieve data
3. Add an instance of the adapter to the Mediator in `server.ts`

Example:

```typescript
// Create a new adapter
const newAdapter = new CustomAdapter('CUSTOM_SOURCE', config);

// Add it to the mediator
mediator.addAdapter(newAdapter);
```

### Adding New Functionality

To add new functionality to the system:

1. Extend the Mediator class with new methods
2. Add new endpoints in the server.ts file

## Project Structure

```
/
├── src/
│   ├── adapters/          # Data source adapters
│   │   ├── IAdapter.ts    # Adapter interface
│   │   ├── SQLAdapter.ts  # SQL database adapter
│   │   └── XMLAdapter.ts  # XML file adapter
│   ├── common/
│   │   └── DataModel.ts   # Common data models
│   ├── mediator/
│   │   ├── Mediator.ts           # Mediator component
│   │   └── ComplexQueryProcessor.ts  # Query processor
│   └── server.ts          # HTTP server implementation
├── index.ts               # Application entry point
├── package.json           # Project dependencies
└── tsconfig.json          # TypeScript configuration
```

## Theoretical Background

This implementation follows the principles of data integration systems:

- **Global-As-View (GAV)** approach: The global schema is defined as views over the local schemas
- **Mediator Architecture**: Uses a mediator to coordinate between data sources
- **Query Reformulation**: Transforms queries from the mediated schema to the source schemas
- **Data Consistency Checking**: Validates references between entities

## Implementation Details

The SQL query functionality is implemented using the following components:

1. **ComplexQueryProcessor** - Parses SQL queries, analyzes them, and executes them against the integrated data.
2. **AlaSQL** - In-memory SQL database engine used for executing the queries.
3. **node-sql-parser** - Parses SQL queries to understand their structure.

Behind the scenes, the system:

1. Parses the SQL query to understand its structure
2. Identifies which tables are needed based on the query
3. Loads data from the appropriate data sources
4. Transforms the data into a format compatible with SQL processing
5. Executes the query using an in-memory SQL engine
6. Returns the results to the client

This implementation follows the principles of query decomposition and reformulation as discussed in data integration theory, enabling complex queries across heterogeneous data sources.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

/**
 * sql-interface.js
 * JavaScript functionality for the SQL execution interface
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('SQL Interface initialized - checking for historyList');
  
  // DOM Elements
  const sqlEditor = document.getElementById('sql-editor');
  const lineNumbers = document.getElementById('line-numbers');
  const runButton = document.getElementById('btn-run');
  const stopButton = document.getElementById('btn-stop');
  const formatButton = document.getElementById('btn-format');
  const clearButton = document.getElementById('btn-clear');
  const saveButton = document.getElementById('btn-save');
  const loadButton = document.getElementById('btn-load');
  const queryTemplateSelect = document.getElementById('query-template');
  const dataSourceSelect = document.getElementById('data-source');
  const resultLimitSelect = document.getElementById('result-limit');
  const resultsTab = document.getElementById('tab-results');
  const messagesTab = document.getElementById('tab-messages');
  const explainTab = document.getElementById('tab-explain');
  const resultsOutput = document.getElementById('results-output');
  const messagesOutput = document.getElementById('messages-output');
  const explainOutput = document.getElementById('explain-output');
  const cursorLine = document.getElementById('cursor-line');
  const cursorColumn = document.getElementById('cursor-column');
  const schemaSearch = document.getElementById('schema-search');
  const schemaItems = document.querySelectorAll('.schema-item');
  // These elements may be removed if sidebar was removed
  const historyList = document.getElementById('history-list');
  console.log('historyList element found:', historyList); // Debug log to check if historyList exists
  const clearHistoryButton = document.querySelector('.btn-clear-history');
  const exportButton = document.getElementById('btn-export');

  // Modal Elements
  const saveModal = document.getElementById('save-modal');
  const loadModal = document.getElementById('load-modal');
  const tablePreviewModal = document.getElementById('table-preview-modal');
  const saveModalClose = document.getElementById('save-modal-close');
  const saveModalCancel = document.getElementById('save-modal-cancel');
  const saveModalSave = document.getElementById('save-modal-save');
  const loadModalClose = document.getElementById('load-modal-close');
  const loadModalCancel = document.getElementById('load-modal-cancel');
  const previewModalClose = document.getElementById('preview-modal-close');
  const previewModalCloseBtn = document.getElementById('preview-modal-close-btn');
  const queryNameInput = document.getElementById('query-name');
  const queryDescriptionInput = document.getElementById('query-description');
  const savedQueriesList = document.getElementById('saved-queries-list');
  const previewTableName = document.getElementById('preview-table-name');
  const tablePreviewContainer = document.getElementById('table-preview-container');

  // Current state
  let isExecuting = false;
  let currentExecutionController = null;
  let currentQuery = '';
  let queryHistory = loadQueryHistory();
  let savedQueries = loadSavedQueries();

  // SQL Keywords for syntax highlighting
  const sqlKeywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'ON', 'AS',
    'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'INSERT', 'INTO',
    'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW',
    'PROCEDURE', 'FUNCTION', 'TRIGGER', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR',
    'NOT', 'NULL', 'IS', 'IN', 'BETWEEN', 'LIKE', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    'DISTINCT', 'TOP', 'WITH', 'CAST', 'CONVERT', 'IF', 'DECLARE', 'EXPLAIN', 'ANALYZE'
  ];

  // SQL Templates
  const queryTemplates = {
    'select-clients': 'SELECT * FROM Clients LIMIT 100;',
    'select-employees': 'SELECT * FROM Employees LIMIT 100;',
    'select-orders': 'SELECT * FROM Commandes ORDER BY date_commande DESC LIMIT 100;',
    'join-orders-clients': 
      'SELECT c.id_commande, c.date_commande, cl.nom_complet, c.montant\n' +
      'FROM Commandes c\n' +
      'JOIN Clients cl ON c.client_ref = cl.id_client\n' +
      'ORDER BY c.date_commande DESC\n' +
      'LIMIT 100;',
    'count-by-client': 
      'SELECT cl.id_client, cl.nom_complet, COUNT(c.id_commande) as nombre_commandes, SUM(c.montant) as montant_total\n' +
      'FROM Clients cl\n' +
      'LEFT JOIN Commandes c ON cl.id_client = c.client_ref\n' +
      'GROUP BY cl.id_client, cl.nom_complet\n' +
      'ORDER BY nombre_commandes DESC\n' +
      'LIMIT 100;',
    'product-inventory': 
      'SELECT id_produit, description, prix_cout, categorie, source_system\n' +
      'FROM Produits\n' +
      'ORDER BY prix_cout DESC\n' +
      'LIMIT 100;',
    'top-products-by-orders': 
      'SELECT p.id_produit, p.description, SUM(dc.quantite) as quantite_totale\n' +
      'FROM Produits p\n' +
      'JOIN Details_Commande dc ON p.id_produit = dc.id_produit\n' +
      'GROUP BY p.id_produit, p.description\n' +
      'ORDER BY quantite_totale DESC\n' +
      'LIMIT 10;',
    'recent-invoices': 
      'SELECT f.id_facture, f.date_facture, c.id_commande, cl.nom_complet, f.montant_total\n' +
      'FROM Factures f\n' +
      'JOIN Commandes c ON f.commande_ref = c.id_commande\n' +
      'JOIN Clients cl ON c.client_ref = cl.id_client\n' +
      'ORDER BY f.date_facture DESC\n' +
      'LIMIT 100;',
    'pending-deliveries': 
      'SELECT l.id_livraison, l.date_estimee, l.statut, c.id_commande, cl.nom_complet, cl.adresse\n' +
      'FROM Livraisons l\n' +
      'JOIN Commandes c ON l.commande_ref = c.id_commande\n' +
      'JOIN Clients cl ON c.client_ref = cl.id_client\n' +
      'WHERE l.statut = "En cours"\n' +
      'ORDER BY l.date_estimee\n' +
      'LIMIT 100;',
    'suppliers-and-products': 
      'SELECT f.id_fournisseur, f.nom_fournisseur, p.id_produit, p.description, a.quantite\n' +
      'FROM Fournisseurs f\n' +
      'JOIN Approvisionnements a ON f.id_fournisseur = a.id_fournisseur\n' +
      'JOIN Produits p ON a.id_produit = p.id_produit\n' +
      'ORDER BY f.nom_fournisseur\n' +
      'LIMIT 100;',
    'complex-multi-join': 
      'SELECT c.id_commande, c.date_commande, cl.nom_complet as client_nom, e.nom_complet as employee_nom,\n' +
      '       p.description as produit, dc.quantite,\n' +
      '       f.id_facture, f.montant_total, l.statut as statut_livraison\n' +
      'FROM Commandes c\n' +
      'JOIN Clients cl ON c.client_ref = cl.id_client\n' +
      'JOIN Employees e ON c.employe_ref = e.id_employe\n' +
      'JOIN Details_Commande dc ON c.id_commande = dc.id_commande\n' +
      'JOIN Produits p ON dc.id_produit = p.id_produit\n' +
      'LEFT JOIN Factures f ON c.id_commande = f.commande_ref\n' +
      'LEFT JOIN Livraisons l ON c.id_commande = l.commande_ref\n' +
      'ORDER BY c.date_commande DESC\n' +
      'LIMIT 100;',
    'average-order-value': 
      'SELECT\n' +
      '    YEAR(c.date_commande) as annee,\n' +
      '    MONTH(c.date_commande) as mois,\n' +
      '    COUNT(c.id_commande) as nombre_commandes,\n' +
      '    AVG(c.montant) as valeur_moyenne,\n' +
      '    SUM(c.montant) as revenu_total\n' +
      'FROM Commandes c\n' +
      'GROUP BY annee, mois\n' +
      'ORDER BY annee DESC, mois DESC\n' +
      'LIMIT 24;',
    'employee-performance': 
      'SELECT e.id_employe, e.nom_complet, e.poste,\n' +
      '       COUNT(c.id_commande) as nombre_commandes,\n' +
      '       SUM(c.montant) as montant_total,\n' +
      '       AVG(c.montant) as montant_moyen\n' +
      'FROM Employees e\n' +
      'LEFT JOIN Commandes c ON e.id_employe = c.employe_ref\n' +
      'GROUP BY e.id_employe, e.nom_complet, e.poste\n' +
      'ORDER BY nombre_commandes DESC, montant_total DESC;'
  };

  // Initialize the SQL editor with line numbers
  function initializeEditor() {
    // Set initial content as plain text
    sqlEditor.textContent = '-- Entrez votre requête SQL ici\nSELECT * FROM Clients LIMIT 100;';
    
    // Apply line numbers and process text
    updateLineNumbers();
    processEditorText();

    // Detect input events - use a debounce to prevent performance issues
    let inputTimer;
    sqlEditor.addEventListener('input', function() {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(function() {
        // Update line numbers (which doesn't affect the editor content)
        updateLineNumbers();
        
        // Only update cursor position display, avoid modifying content during typing
        updateCursorPosition();
      }, 150); // 150ms debounce for better performance
    });

    // Detect key events for shortcuts
    sqlEditor.addEventListener('keydown', function(e) {
      // Run query with Ctrl+Enter
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        executeQuery();
      }
      
      // Save query with Ctrl+S
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        openSaveModal();
      }
      
      // Handle tab key for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '    ');
      }
      
      // Comment/uncomment with Ctrl+/
      if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleComment();
      }
    });

    // Track cursor position
    sqlEditor.addEventListener('click', updateCursorPosition);
    sqlEditor.addEventListener('keyup', updateCursorPosition);
    
    // Process text when the editor loses focus (to clean up any formatting)
    sqlEditor.addEventListener('blur', processEditorText);
  }

  // Update line numbers in the editor
  function updateLineNumbers() {
    // Get the text content without HTML tags
    const text = sqlEditor.innerText || sqlEditor.textContent;
    const lines = text.split('\n');
    let html = '';
    
    for (let i = 0; i < lines.length; i++) {
      html += `<div>${i + 1}</div>`;
    }
    
    lineNumbers.innerHTML = html;
  }

  // Update the cursor position display
  function updateCursorPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Handle case where range might not be in a text node
    if (!range.startContainer || range.startContainer.nodeType !== Node.TEXT_NODE) {
      // Just display position 1,1 if we can't determine actual position
      cursorLine.textContent = 1;
      cursorColumn.textContent = 1;
      return;
    }
    
    // Get text before the cursor, handling HTML content properly
    let textBeforeCursor = '';
    const nodes = [];
    const treeWalker = document.createTreeWalker(sqlEditor, NodeFilter.SHOW_TEXT);
    let currentNode;
    
    while (currentNode = treeWalker.nextNode()) {
      nodes.push(currentNode);
      if (currentNode === range.startContainer) {
        textBeforeCursor += currentNode.nodeValue.substring(0, range.startOffset);
        break;
      } else {
        textBeforeCursor += currentNode.nodeValue;
      }
    }
    
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    cursorLine.textContent = line;
    cursorColumn.textContent = column;
  }

  // Process the editor content - no syntax highlighting applied
  function processEditorText() {
    // Save cursor position and focus state
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const hasFocus = document.activeElement === sqlEditor;
    
    // Get the raw text content without HTML tags
    const text = sqlEditor.innerText || sqlEditor.textContent || '';
    
    // Simply set the text content without any syntax highlighting
    // This preserves line breaks but doesn't add any HTML formatting
    sqlEditor.textContent = text;
    
    // Restore focus if editor had focus
    if (hasFocus) {
      sqlEditor.focus();
      
      // Restore cursor position if we had a valid range
      if (range) {
        const newRange = document.createRange();
        const treeWalker = document.createTreeWalker(sqlEditor, NodeFilter.SHOW_TEXT);
        let currentNode = treeWalker.nextNode();
        
        if (currentNode) {
          // Set cursor at the same position in the new text node
          const offset = Math.min(range.startOffset, currentNode.length);
          newRange.setStart(currentNode, offset);
          newRange.setEnd(currentNode, offset);
          
          // Apply the range to the selection
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }
  }

  // Toggle comment on the current selection or line
  function toggleComment() {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // Get the text content of the editor without HTML tags
    const text = sqlEditor.innerText;
    
    // Get the start and end of the selection
    let start = 0;
    let end = text.length;
    
    // Find the start of the line where the selection begins
    const beforeSelection = text.substring(0, range.startOffset);
    start = beforeSelection.lastIndexOf('\n') + 1;
    if (start < 0) start = 0;
    
    // Find the end of the line where the selection ends
    const afterSelection = text.substring(range.endOffset);
    end = range.endOffset;
    if (afterSelection.indexOf('\n') >= 0) {
      end += afterSelection.indexOf('\n');
    }
    
    // Get the selected lines
    const selectedText = text.substring(start, end);
    const isCommented = selectedText.trim().startsWith('--');
    
    // Toggle comment
    let newText;
    if (isCommented) {
      // Uncomment
      newText = text.substring(0, start) + 
        selectedText.replace(/^--\s?/gm, '') + 
        text.substring(end);
    } else {
      // Comment
      newText = text.substring(0, start) + 
        '-- ' + selectedText + 
        text.substring(end);
    }
    
    // Update the editor content
    sqlEditor.textContent = newText;
    
    // Update line numbers and process text
    updateLineNumbers();
    processEditorText();
  }

  // Execute the current SQL query
  async function executeQuery() {
    if (isExecuting) {
      showToast('warning', 'Une requête est déjà en cours d\'exécution.');
      return;
    }
    
    // Get the current query from the editor (use innerText to get text without HTML tags)
    currentQuery = sqlEditor.innerText.trim();
    
    if (!currentQuery) {
      showToast('warning', 'Veuillez entrer une requête SQL.');
      return;
    }
    
    // Update UI state
    isExecuting = true;
    runButton.disabled = true;
    stopButton.disabled = false;
    clearMessagesPanel();
    showMessage('info', 'Exécution de la requête...');
    
    // Check if this is an EXPLAIN query
    const isExplainQuery = currentQuery.toUpperCase().trim().startsWith('EXPLAIN');
    
    // Show the appropriate tab
    if (isExplainQuery) {
      switchTab(explainTab);
    } else {
      switchTab(resultsTab);
    }
    
    // Prepare the request
    const dataSource = dataSourceSelect.value;
    const resultLimit = parseInt(resultLimitSelect.value, 10);
    
    // Create an AbortController to allow cancelling the request
    currentExecutionController = new AbortController();
    const signal = currentExecutionController.signal;
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: currentQuery,
          parameters: {
            dataSource,
            limit: resultLimit
          }
        }),
        signal
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error executing query');
      }
      
      // Debug: Log the response data
      console.log('Query response:', result);
      console.log('Query response type:', typeof result);
      console.log('Query response structure:', Object.keys(result));
      
      // Check if result contains an error property
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Add to query history
      addToQueryHistory(currentQuery);
      
      // Show the appropriate output
      if (isExplainQuery) {
        displayExplainPlan(result);
      } else {
        displayQueryResults(result);
      }
      
      showMessage('success', `Requête exécutée avec succès. Temps: ${result.executionTime || 0}ms`);
    } catch (error) {
      if (error.name === 'AbortError') {
        showMessage('warning', 'Exécution de la requête annulée.');
      } else {
        console.error('Error executing query:', error);
        showMessage('error', `Erreur: ${error.message}`);
        
        // Show a more user-friendly error in the results tab
        resultsOutput.innerHTML = `
          <div class="error-container">
            <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
            <div class="error-message">
              <h3>Erreur lors de l'exécution de la requête</h3>
              <p>${error.message}</p>
              <pre class="error-details">${error.stack || ''}</pre>
            </div>
          </div>
        `;
        
        switchTab(messagesTab);
      }
    } finally {
      // Reset UI state
      isExecuting = false;
      runButton.disabled = false;
      stopButton.disabled = true;
      currentExecutionController = null;
    }
  }

  // Stop the current query execution
  function stopQueryExecution() {
    if (currentExecutionController) {
      currentExecutionController.abort();
      currentExecutionController = null;
    }
  }

  // Format the SQL query with indentation
  function formatSQLQuery() {
    try {
      // Get the current query (use innerText to get text without HTML tags)
      const query = sqlEditor.innerText;
      
      // Use the formatSQL utility function
      const formattedQuery = formatSQL(query);
      
      // Update the editor
      sqlEditor.textContent = formattedQuery;
      updateLineNumbers();
      processEditorText();
      
      showToast('success', 'Requête formatée');
    } catch (error) {
      showToast('error', 'Erreur lors du formatage: ' + error.message);
    }
  }

  // Clear the SQL editor
  function clearEditor() {
    sqlEditor.innerHTML = '';
    updateLineNumbers();
    processEditorText();
  }

  // Display query results in the results tab
  function displayQueryResults(data) {
    // Clear previous results
    resultsOutput.innerHTML = '';
    
    // Debug: Log data received by the display function
    console.log('Data received for display:', data);
    console.log('Data type:', typeof data);
    
    // Check if data has the expected structure
    if (!data) {
      console.error('No data received');
      resultsOutput.innerHTML = `
        <div class="results-placeholder">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Erreur de données</h3>
          <p>Aucune donnée n'a été reçue du serveur.</p>
        </div>
      `;
      return;
    }
    
    // Handle different response structures
    let resultsArray;
    
    // If data is an array itself (direct results array), use it
    if (Array.isArray(data)) {
      console.log('Data is directly an array, using it as results');
      resultsArray = data;
    } 
    // If data has results property that's an array, use that
    else if (data.results && Array.isArray(data.results)) {
      console.log('Using data.results array');
      resultsArray = data.results;
    }
    // If data has a data property with results
    else if (data.data && Array.isArray(data.data)) {
      console.log('Using data.data array');
      resultsArray = data.data;
    }
    // If data has a data.results property
    else if (data.data && data.data.results && Array.isArray(data.data.results)) {
      console.log('Using data.data.results array');
      resultsArray = data.data.results;
    }
    // If data is just a plain object, wrap it in an array
    else if (typeof data === 'object' && !Array.isArray(data)) {
      console.log('Data appears to be a single result object, wrapping in array');
      // Check if any property contains an array we could use
      const arrayProps = Object.entries(data).find(([_, val]) => Array.isArray(val));
      if (arrayProps) {
        console.log(`Found array in property: ${arrayProps[0]}`);
        resultsArray = arrayProps[1];
      } else {
        // No arrays found, use the object itself
        resultsArray = [data];
      }
    }
    
    // Final check if we have valid results to display
    if (!resultsArray || !Array.isArray(resultsArray) || resultsArray.length === 0) {
      console.error('No valid results array found in data:', data);
      resultsOutput.innerHTML = `
        <div class="results-placeholder">
          <i class="fas fa-database"></i>
          <h3>Aucun résultat</h3>
          <p>La requête a été exécutée mais n'a retourné aucun résultat.</p>
        </div>
      `;
      return;
    }
    
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'results-table-container';
    
    // Create results info
    const resultsInfo = document.createElement('div');
    resultsInfo.className = 'results-info';
    
    // Add row count info
    const rowCountInfo = document.createElement('div');
    rowCountInfo.className = 'results-info-item';
    rowCountInfo.innerHTML = `
      <i class="fas fa-list"></i>
      <span>${resultsArray.length} ligne${resultsArray.length !== 1 ? 's' : ''}</span>
    `;
    
    // Add execution time info
    const timeInfo = document.createElement('div');
    timeInfo.className = 'results-info-item';
    timeInfo.innerHTML = `
      <i class="fas fa-clock"></i>
      <span>${data.executionTime || 0} ms</span>
    `;
    
    resultsInfo.appendChild(rowCountInfo);
    resultsInfo.appendChild(timeInfo);
    resultsContainer.appendChild(resultsInfo);
    
    // Create table
    const table = document.createElement('table');
    table.className = 'results-table';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Check if the first result exists and is an object
    if (!resultsArray[0] || typeof resultsArray[0] !== 'object') {
      console.error("First result item is invalid:", resultsArray);
      
      // Check if the results might be primitive values
      if (resultsArray.length > 0 && (typeof resultsArray[0] === 'string' || 
                                     typeof resultsArray[0] === 'number' || 
                                     typeof resultsArray[0] === 'boolean')) {
        // Handle primitive values by creating a simple "Value" column
        const th = document.createElement('th');
        th.textContent = "Value";
        headerRow.appendChild(th);
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body for primitive values
        const tbody = document.createElement('tbody');
        resultsArray.forEach(value => {
          const tr = document.createElement('tr');
          const td = document.createElement('td');
          td.textContent = value !== null ? value : 'NULL';
          tr.appendChild(td);
          tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        resultsContainer.appendChild(table);
        resultsOutput.appendChild(resultsContainer);
        return;
      }
      
      // If not a primitive array, show error
      resultsContainer.innerHTML = `
        <div class="error-message">
          <p>Results array exists but first item is invalid. Check console for details.</p>
        </div>
      `;
      resultsOutput.appendChild(resultsContainer);
      return;
    }
    
    // Get column names from the first result
    const columns = Object.keys(resultsArray[0]);
    
    // Make sure we have columns
    if (!columns.length) {
      console.error("No columns found in results:", resultsArray[0]);
      resultsContainer.innerHTML = `
        <div class="error-message">
          <p>No columns found in result data. Check console for details.</p>
        </div>
      `;
      resultsOutput.appendChild(resultsContainer);
      return;
    }
    
    // Add columns to header row
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Handle data rows
    try {
      resultsArray.forEach(row => {
        const tr = document.createElement('tr');
        
        columns.forEach(column => {
          const td = document.createElement('td');
          
          // Handle different data types safely
          if (row[column] === null || row[column] === undefined) {
            td.textContent = 'NULL';
            td.classList.add('null-value');
          } else if (typeof row[column] === 'object') {
            // For objects, display as JSON
            td.textContent = JSON.stringify(row[column]);
          } else {
            // For primitives, display as string
            td.textContent = String(row[column]);
          }
          
          tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
      });
    } catch (error) {
      console.error("Error rendering table rows:", error);
      resultsContainer.innerHTML = `
        <div class="error-message">
          <p>Error rendering result data: ${error.message}</p>
        </div>
      `;
      resultsOutput.appendChild(resultsContainer);
      return;
    }
    
    table.appendChild(tbody);
    resultsContainer.appendChild(table);
    resultsOutput.appendChild(resultsContainer);
  }

  // Display execution plan in the explain tab
  function displayExplainPlan(data) {
    // Clear previous results
    explainOutput.innerHTML = '';
    
    if (!data || !data.explainPlan) {
      explainOutput.innerHTML = `
        <div class="explain-placeholder">
          <i class="fas fa-project-diagram"></i>
          <h3>Aucun plan d'exécution</h3>
          <p>Utilisez EXPLAIN avant votre requête pour voir le plan d'exécution.</p>
        </div>
      `;
      return;
    }
    
    // Create explain container
    const explainContainer = document.createElement('div');
    explainContainer.className = 'explain-container';
    
    // If the plan is a string, display it with code formatting
    if (typeof data.explainPlan === 'string') {
      const explainCode = document.createElement('pre');
      explainCode.className = 'explain-code';
      explainCode.textContent = data.explainPlan;
      explainContainer.appendChild(explainCode);
    } 
    // If the plan is an object, create a visual representation
    else if (typeof data.explainPlan === 'object') {
      const explainTree = document.createElement('div');
      explainTree.className = 'explain-tree';
      
      // Recursive function to build the plan tree
      function buildPlanTree(node, parent) {
        if (!node) return;
        
        const nodeElement = document.createElement('div');
        nodeElement.className = 'explain-node';
        
        const nodeHeader = document.createElement('div');
        nodeHeader.className = 'explain-node-header';
        nodeHeader.innerHTML = `
          <div class="node-type">${node.type || 'Unknown'}</div>
          ${node.cost ? `<div class="node-cost">Cost: ${node.cost}</div>` : ''}
        `;
        
        nodeElement.appendChild(nodeHeader);
        
        if (node.details) {
          const nodeDetails = document.createElement('div');
          nodeDetails.className = 'explain-node-details';
          
          Object.entries(node.details).forEach(([key, value]) => {
            const detailRow = document.createElement('div');
            detailRow.className = 'detail-row';
            detailRow.innerHTML = `
              <span class="detail-key">${key}:</span>
              <span class="detail-value">${value}</span>
            `;
            nodeDetails.appendChild(detailRow);
          });
          
          nodeElement.appendChild(nodeDetails);
        }
        
        parent.appendChild(nodeElement);
        
        if (node.children && Array.isArray(node.children)) {
          const childrenContainer = document.createElement('div');
          childrenContainer.className = 'explain-children';
          nodeElement.appendChild(childrenContainer);
          
          node.children.forEach(child => buildPlanTree(child, childrenContainer));
        }
      }
      
      buildPlanTree(data.explainPlan, explainTree);
      explainContainer.appendChild(explainTree);
    }
    
    explainOutput.appendChild(explainContainer);
  }

  // Show a message in the messages panel
  function showMessage(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const messageElement = document.createElement('div');
    messageElement.className = `system-message ${type}-message`;
    messageElement.innerHTML = `
      <span class="timestamp">${timestamp}</span>
      <span class="message">${message}</span>
    `;
    
    messagesOutput.querySelector('.message-list').appendChild(messageElement);
    messageElement.scrollIntoView({ behavior: 'smooth' });
  }

  // Clear the messages panel
  function clearMessagesPanel() {
    const messageList = messagesOutput.querySelector('.message-list');
    messageList.innerHTML = '';
  }

  // Switch between results tabs
  function switchTab(tab) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Add active class to the selected tab
    tab.classList.add('active');
    
    // Hide all panel content
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
    
    // Show the selected panel content
    const panelId = tab.getAttribute('data-panel');
    document.getElementById(panelId).classList.add('active');
  }

  // Add a query to the history
  function addToQueryHistory(query) {
    const timestamp = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString();
    
    // Create a new history item
    const historyItem = {
      id: Date.now(),
      query,
      timestamp,
      date,
      dataSource: dataSourceSelect.value
    };
    
    // Add to the history array
    queryHistory.unshift(historyItem);
    
    // Limit history to 50 items
    if (queryHistory.length > 50) {
      queryHistory.pop();
    }
    
    // Save to local storage
    saveQueryHistory();
    
    // Update the UI only if the history list exists
    if (historyList) {
      updateQueryHistoryUI();
    }
  }

  // Load query history from local storage
  function loadQueryHistory() {
    try {
      const savedHistory = localStorage.getItem('sqlQueryHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error('Error loading query history:', error);
      return [];
    }
  }

  // Save query history to local storage
  function saveQueryHistory() {
    try {
      localStorage.setItem('sqlQueryHistory', JSON.stringify(queryHistory));
    } catch (error) {
      console.error('Error saving query history:', error);
    }
  }

  // Update the query history UI
  function updateQueryHistoryUI() {
    // Check if historyList exists before trying to access it
    if (!historyList) {
      console.log('History list element not found in the DOM - sidebar may have been removed');
      return;
    }
    
    // Clear the current history list
    historyList.innerHTML = '';
    
    if (queryHistory.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <i class="fas fa-clock empty-icon"></i>
          <p>Aucun historique de requête</p>
        </div>
      `;
      return;
    }
    
    // Add each history item to the list
    queryHistory.forEach(item => {
      if (!historyList) return; // Skip if historyList doesn't exist
      
      const historyItemElement = document.createElement('div');
      historyItemElement.className = 'history-item';
      historyItemElement.setAttribute('data-id', item.id);
      
      historyItemElement.innerHTML = `
        <div class="history-item-header">
          <span class="history-time">${item.date} ${item.timestamp}</span>
        </div>
        <div class="history-query">${item.query.length > 50 ? item.query.substring(0, 50) + '...' : item.query}</div>
        <div class="history-meta">
          <span>Source: ${item.dataSource === 'all' ? 'Toutes' : item.dataSource}</span>
        </div>
      `;
      
      // Add click event to load the query
      historyItemElement.addEventListener('click', () => {
        // Set plain text first
        sqlEditor.textContent = item.query;
        // Then update display
        updateLineNumbers();
        processEditorText();
        showToast('info', 'Requête chargée depuis l\'historique');
      });
      
      historyList.appendChild(historyItemElement);
    });
  }

  // Clear query history
  function clearQueryHistory() {
    queryHistory = [];
    saveQueryHistory();
    // Only update UI if historyList exists
    if (historyList) {
      updateQueryHistoryUI();
    }
    showToast('info', 'Historique des requêtes effacé');
  }

  // Open the save query modal
  function openSaveModal() {
    const query = sqlEditor.innerText.trim();
    
    if (!query) {
      showToast('warning', 'Aucune requête à sauvegarder');
      return;
    }
    
    // Reset form fields
    queryNameInput.value = '';
    queryDescriptionInput.value = '';
    
    // Show the modal
    saveModal.classList.add('visible');
    queryNameInput.focus();
  }

  // Save the current query
  function saveQuery() {
    const query = sqlEditor.innerText.trim();
    const name = queryNameInput.value.trim();
    const description = queryDescriptionInput.value.trim();
    
    if (!query) {
      showToast('warning', 'Aucune requête à sauvegarder');
      return;
    }
    
    if (!name) {
      showToast('warning', 'Veuillez entrer un nom pour la requête');
      queryNameInput.focus();
      return;
    }
    
    // Create a new saved query item
    const savedQuery = {
      id: Date.now(),
      name,
      description,
      query,
      date: new Date().toLocaleDateString()
    };
    
    // Add to the saved queries array
    savedQueries.push(savedQuery);
    
    // Save to local storage
    saveSavedQueries();
    
    // Hide the modal
    saveModal.classList.remove('visible');
    
    showToast('success', 'Requête sauvegardée');
  }

  // Open the load query modal
  function openLoadModal() {
    // Update the saved queries list
    updateSavedQueriesUI();
    
    // Show the modal
    loadModal.classList.add('visible');
  }

  // Update the saved queries UI
  function updateSavedQueriesUI() {
    // Clear the current list
    savedQueriesList.innerHTML = '';
    
    if (savedQueries.length === 0) {
      savedQueriesList.innerHTML = `
        <div class="empty-queries">
          <i class="fas fa-folder-open"></i>
          <p>Aucune requête sauvegardée</p>
        </div>
      `;
      return;
    }
    
    // Add each saved query to the list
    savedQueries.forEach(item => {
      const queryItemElement = document.createElement('div');
      queryItemElement.className = 'saved-query-item';
      queryItemElement.setAttribute('data-id', item.id);
      
      queryItemElement.innerHTML = `
        <div class="saved-query-name">${item.name}</div>
        ${item.description ? `<div class="saved-query-description">${item.description}</div>` : ''}
        <div class="saved-query-preview">${item.query.length > 50 ? item.query.substring(0, 50) + '...' : item.query}</div>
      `;
      
      // Add click event to load the query
      queryItemElement.addEventListener('click', () => {
        // Set plain text first
        sqlEditor.textContent = item.query;
        // Then update display
        updateLineNumbers();
        processEditorText();
        loadModal.classList.remove('visible');
        showToast('info', `Requête "${item.name}" chargée`);
      });
      
      savedQueriesList.appendChild(queryItemElement);
    });
  }

  // Load saved queries from local storage
  function loadSavedQueries() {
    try {
      const savedQueries = localStorage.getItem('sqlSavedQueries');
      return savedQueries ? JSON.parse(savedQueries) : [];
    } catch (error) {
      console.error('Error loading saved queries:', error);
      return [];
    }
  }

  // Save queries to local storage
  function saveSavedQueries() {
    try {
      localStorage.setItem('sqlSavedQueries', JSON.stringify(savedQueries));
    } catch (error) {
      console.error('Error saving queries:', error);
    }
  }

  // Open table preview modal
  function openTablePreview(tableName) {
    // Update the modal title
    previewTableName.textContent = `Table: ${tableName}`;
    
    // Show loading state
    tablePreviewContainer.innerHTML = `
      <div class="preview-loading">
        <div class="spinner"></div>
        <p>Chargement des données...</p>
      </div>
    `;
    
    // Show the modal
    tablePreviewModal.classList.add('visible');
    
    // Fetch table data
    fetchTablePreview(tableName);
  }

  // Fetch table preview data from the server
  async function fetchTablePreview(tableName) {
    try {
      const response = await fetch(`/api/table-preview?table=${encodeURIComponent(tableName)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error fetching table data');
      }
      
      displayTablePreview(data);
    } catch (error) {
      tablePreviewContainer.innerHTML = `
        <div class="preview-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erreur lors du chargement: ${error.message}</p>
        </div>
      `;
    }
  }

  // Display table preview data
  function displayTablePreview(data) {
    if (!data || !data.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
      tablePreviewContainer.innerHTML = `
        <div class="preview-empty">
          <i class="fas fa-table"></i>
          <p>Aucune donnée à afficher pour cette table</p>
        </div>
      `;
      return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'results-table';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Get column names from the first row
    const columns = Object.keys(data.rows[0]);
    
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    data.rows.forEach(row => {
      const tr = document.createElement('tr');
      
      columns.forEach(column => {
        const td = document.createElement('td');
        td.textContent = row[column] !== null ? row[column] : 'NULL';
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    
    // Clear container and add table
    tablePreviewContainer.innerHTML = '';
    tablePreviewContainer.appendChild(table);
  }

  // Export results to CSV
  function exportResultsToCSV() {
    const resultsTable = resultsOutput.querySelector('.results-table');
    
    if (!resultsTable) {
      showToast('warning', 'Aucun résultat à exporter');
      return;
    }
    
    try {
      // Get headers
      const headers = [];
      const headerCells = resultsTable.querySelectorAll('thead th');
      headerCells.forEach(cell => headers.push(cell.textContent));
      
      // Get rows
      const rows = [];
      const rowElements = resultsTable.querySelectorAll('tbody tr');
      
      rowElements.forEach(rowElement => {
        const row = [];
        const cells = rowElement.querySelectorAll('td');
        cells.forEach(cell => row.push(cell.textContent));
        rows.push(row);
      });
      
      // Create CSV content
      let csvContent = headers.join(',') + '\\n';
      
      rows.forEach(row => {
        // Escape fields that contain commas or quotes
        const escapedRow = row.map(field => {
          // If field contains commas, quotes, or newlines, wrap it in quotes
          if (field.includes(',') || field.includes('"') || field.includes('\\n')) {
            // Replace any quotes with double quotes for escaping
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        });
        
        csvContent += escapedRow.join(',') + '\\n';
      });
      
      // Create a blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('success', 'Résultats exportés en CSV');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      showToast('error', 'Erreur lors de l\'exportation: ' + error.message);
    }
  }

  // Filter schema items by search term
  function filterSchemaItems(searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    schemaItems.forEach(item => {
      const tableName = item.getAttribute('data-table').toLowerCase();
      if (tableName.includes(lowerSearchTerm) || !searchTerm) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  // Show toast notification
  function showToast(type, message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Add content
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
      </div>
      <div class="toast-content">${message}</div>
      <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Add close functionality
    const closeButton = toast.querySelector('.toast-close');
    closeButton.addEventListener('click', () => {
      toast.classList.add('hiding');
      setTimeout(() => {
        toast.remove();
      }, 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 5000);
  }

  // Helper function to escape HTML
  function escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Debug function to check what's happening with the editor
  function debugEditor() {
    console.log('Editor content (innerHTML):', sqlEditor.innerHTML);
    console.log('Editor content (innerText):', sqlEditor.innerText);
    console.log('Editor content (textContent):', sqlEditor.textContent);
  }

  // Initialize the application
  function init() {
    // Initialize editor if it exists
    if (sqlEditor) {
      initializeEditor();
    } else {
      console.warn('SQL Editor element not found in the DOM');
    }
    
    // Update history UI if historyList exists
    if (historyList) {
      updateQueryHistoryUI();
    } else {
      console.log('History list element not found - sidebar may have been removed');
    }
    
    // Set up event listeners for buttons (only if they exist)
    if (runButton) runButton.addEventListener('click', executeQuery);
    if (stopButton) stopButton.addEventListener('click', stopQueryExecution);
    if (formatButton) formatButton.addEventListener('click', formatSQLQuery);
    if (clearButton) clearButton.addEventListener('click', clearEditor);
    if (saveButton) saveButton.addEventListener('click', openSaveModal);
    if (loadButton) loadButton.addEventListener('click', openLoadModal);
    if (clearHistoryButton) clearHistoryButton.addEventListener('click', clearQueryHistory);
    if (exportButton) exportButton.addEventListener('click', exportResultsToCSV);
    
    // Set up event listeners for tabs (only if they exist)
    if (resultsTab) resultsTab.addEventListener('click', () => switchTab(resultsTab));
    if (messagesTab) messagesTab.addEventListener('click', () => switchTab(messagesTab));
    if (explainTab) explainTab.addEventListener('click', () => switchTab(explainTab));
    
    // Set up event listeners for modals (only if they exist)
    if (saveModalClose) saveModalClose.addEventListener('click', () => saveModal.classList.remove('visible'));
    if (saveModalCancel) saveModalCancel.addEventListener('click', () => saveModal.classList.remove('visible'));
    if (saveModalSave) saveModalSave.addEventListener('click', saveQuery);
    
    if (loadModalClose) loadModalClose.addEventListener('click', () => loadModal.classList.remove('visible'));
    if (loadModalCancel) loadModalCancel.addEventListener('click', () => loadModal.classList.remove('visible'));
    
    if (previewModalClose) previewModalClose.addEventListener('click', () => tablePreviewModal.classList.remove('visible'));
    if (previewModalCloseBtn) previewModalCloseBtn.addEventListener('click', () => tablePreviewModal.classList.remove('visible'));
    
    // Set up event listener for query template select (only if it exists)
    if (queryTemplateSelect) {
      queryTemplateSelect.addEventListener('change', function() {
        const templateId = this.value;
        if (templateId && queryTemplates[templateId]) {
          // Set plain text first
          sqlEditor.textContent = queryTemplates[templateId];
          // Then update display
          updateLineNumbers();
          processEditorText();
          this.value = ''; // Reset select
        }
      });
    }
    
    // Set up event listener for schema search
    if (schemaSearch) {
      schemaSearch.addEventListener('input', function() {
        filterSchemaItems(this.value);
      });
    }
    
    // Set up event listeners for schema items
    if (schemaItems && schemaItems.length > 0) {
      schemaItems.forEach(item => {
        const tableName = item.getAttribute('data-table');
        const previewIcon = item.querySelector('.preview-icon');
        
        // Double-click on table name inserts the table name in the editor
        item.addEventListener('dblclick', () => {
          if (sqlEditor) {
            document.execCommand('insertText', false, tableName);
          }
        });
        
        // Click on preview icon opens the table preview
        if (previewIcon) {
          previewIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            openTablePreview(tableName);
          });
        }
      });
    }
    
    // Set up collapsible sections
    const collapsibleButtons = document.querySelectorAll('.btn-collapse');
    if (collapsibleButtons && collapsibleButtons.length > 0) {
      collapsibleButtons.forEach(button => {
        button.addEventListener('click', function() {
          const section = this.closest('.sidebar-section');
          if (section) {
            section.classList.toggle('collapsed');
            
            const icon = this.querySelector('i');
            if (icon) {
              if (section.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
              } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
              }
            }
          }
        });
      });
    }
    
    // Set up collapsible categories
    const categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(header => {
      header.addEventListener('click', function() {
        const items = this.nextElementSibling;
        items.classList.toggle('collapsed');
        
        const icon = this.querySelector('i');
        if (items.classList.contains('collapsed')) {
          icon.classList.remove('fa-caret-down');
          icon.classList.add('fa-caret-right');
        } else {
          icon.classList.remove('fa-caret-right');
          icon.classList.add('fa-caret-down');
        }
      });
    });
    
    // Add toast styling
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 300px;
      }
      
      .toast {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: toastIn 0.3s ease;
        background-color: var(--surface-card);
        border-left: 4px solid;
      }
      
      .toast.hiding {
        animation: toastOut 0.3s ease forwards;
      }
      
      .toast-success {
        border-left-color: var(--success);
      }
      
      .toast-info {
        border-left-color: var(--info);
      }
      
      .toast-warning {
        border-left-color: var(--warning);
      }
      
      .toast-error {
        border-left-color: var(--error);
      }
      
      .toast-icon {
        margin-right: 12px;
        font-size: 18px;
      }
      
      .toast-success .toast-icon {
        color: var(--success);
      }
      
      .toast-info .toast-icon {
        color: var(--info);
      }
      
      .toast-warning .toast-icon {
        color: var(--warning);
      }
      
      .toast-error .toast-icon {
        color: var(--error);
      }
      
      .toast-content {
        flex: 1;
        font-size: 14px;
        color: var(--text-primary);
      }
      
      .toast-close {
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        margin-left: 12px;
      }
      
      .toast-close:hover {
        color: var(--text-primary);
      }
      
      @keyframes toastIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes toastOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    
    document.head.appendChild(toastStyles);
    
    // Show welcome message
    showMessage('info', 'Bienvenue dans l\'interface SQL. Prêt à exécuter des requêtes.');
  }

  // Initialize on load
  init();
});

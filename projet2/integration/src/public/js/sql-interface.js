/**
 * sql-interface.js
 * JavaScript functionality for the SQL execution interface
 */

document.addEventListener('DOMContentLoaded', function() {
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
  const historyList = document.getElementById('history-list');
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
      'SELECT c.id_commande, c.date_commande, cl.nom, cl.prenom, c.montant_total\n' +
      'FROM Commandes c\n' +
      'JOIN Clients cl ON c.id_client = cl.id_client\n' +
      'ORDER BY c.date_commande DESC\n' +
      'LIMIT 100;',
    'count-by-client': 
      'SELECT cl.id_client, cl.nom, cl.prenom, COUNT(c.id_commande) as nombre_commandes, SUM(c.montant_total) as montant_total\n' +
      'FROM Clients cl\n' +
      'LEFT JOIN Commandes c ON cl.id_client = c.id_client\n' +
      'GROUP BY cl.id_client, cl.nom, cl.prenom\n' +
      'ORDER BY nombre_commandes DESC\n' +
      'LIMIT 100;',
    'product-inventory': 
      'SELECT id_produit, nom_produit, description, prix, quantite_stock\n' +
      'FROM Produits\n' +
      'ORDER BY quantite_stock DESC\n' +
      'LIMIT 100;',
    'clients-with-no-orders': 
      'SELECT id_client, nom, prenom, email, telephone\n' +
      'FROM Clients\n' +
      'WHERE id_client NOT IN (SELECT id_client FROM Commandes)\n' +
      'LIMIT 100;',
    'top-products-by-orders': 
      'SELECT p.id_produit, p.nom_produit, SUM(dc.quantite) as quantite_totale, SUM(dc.prix_unitaire * dc.quantite) as montant_total\n' +
      'FROM Produits p\n' +
      'JOIN Details_Commande dc ON p.id_produit = dc.id_produit\n' +
      'GROUP BY p.id_produit, p.nom_produit\n' +
      'ORDER BY quantite_totale DESC\n' +
      'LIMIT 10;',
    'recent-invoices': 
      'SELECT f.id_facture, f.date_emission, f.date_paiement, c.id_commande, cl.nom, cl.prenom, f.montant_total, f.statut\n' +
      'FROM Factures f\n' +
      'JOIN Commandes c ON f.id_commande = c.id_commande\n' +
      'JOIN Clients cl ON c.id_client = cl.id_client\n' +
      'ORDER BY f.date_emission DESC\n' +
      'LIMIT 100;',
    'pending-deliveries': 
      'SELECT l.id_livraison, l.date_livraison_prevue, l.statut, c.id_commande, cl.nom, cl.prenom, cl.adresse\n' +
      'FROM Livraisons l\n' +
      'JOIN Commandes c ON l.id_commande = c.id_commande\n' +
      'JOIN Clients cl ON c.id_client = cl.id_client\n' +
      'WHERE l.statut = "En cours"\n' +
      'ORDER BY l.date_livraison_prevue\n' +
      'LIMIT 100;',
    'suppliers-and-products': 
      'SELECT f.id_fournisseur, f.nom_entreprise, p.id_produit, p.nom_produit, a.quantite, a.date_approvisionnement\n' +
      'FROM Fournisseurs f\n' +
      'JOIN Approvisionnements a ON f.id_fournisseur = a.id_fournisseur\n' +
      'JOIN Produits p ON a.id_produit = p.id_produit\n' +
      'ORDER BY a.date_approvisionnement DESC\n' +
      'LIMIT 100;',
    'complex-multi-join': 
      'SELECT c.id_commande, c.date_commande, cl.nom as client_nom, e.nom as employee_nom,\n' +
      '       p.nom_produit, dc.quantite, dc.prix_unitaire, (dc.quantite * dc.prix_unitaire) as sous_total,\n' +
      '       f.id_facture, f.statut as statut_facture, l.statut as statut_livraison\n' +
      'FROM Commandes c\n' +
      'JOIN Clients cl ON c.id_client = cl.id_client\n' +
      'JOIN Employees e ON c.id_employee = e.id_employee\n' +
      'JOIN Details_Commande dc ON c.id_commande = dc.id_commande\n' +
      'JOIN Produits p ON dc.id_produit = p.id_produit\n' +
      'LEFT JOIN Factures f ON c.id_commande = f.id_commande\n' +
      'LEFT JOIN Livraisons l ON c.id_commande = l.id_commande\n' +
      'ORDER BY c.date_commande DESC\n' +
      'LIMIT 100;',
    'average-order-value': 
      'SELECT\n' +
      '    YEAR(c.date_commande) as annee,\n' +
      '    MONTH(c.date_commande) as mois,\n' +
      '    COUNT(c.id_commande) as nombre_commandes,\n' +
      '    AVG(c.montant_total) as valeur_moyenne,\n' +
      '    SUM(c.montant_total) as revenu_total\n' +
      'FROM Commandes c\n' +
      'GROUP BY annee, mois\n' +
      'ORDER BY annee DESC, mois DESC\n' +
      'LIMIT 24;',
    'employee-performance': 
      'SELECT e.id_employee, e.nom, e.prenom, e.poste,\n' +
      '       COUNT(c.id_commande) as nombre_commandes,\n' +
      '       SUM(c.montant_total) as montant_total,\n' +
      '       AVG(c.montant_total) as montant_moyen\n' +
      'FROM Employees e\n' +
      'LEFT JOIN Commandes c ON e.id_employee = c.id_employee\n' +
      'GROUP BY e.id_employee, e.nom, e.prenom, e.poste\n' +
      'ORDER BY nombre_commandes DESC, montant_total DESC;'
  };

  // Initialize the SQL editor with line numbers
  function initializeEditor() {
    // Set initial content
    sqlEditor.textContent = '-- Entrez votre requête SQL ici\nSELECT * FROM Clients LIMIT 100;';
    updateLineNumbers();
    highlightSyntax();

    // Detect input events
    sqlEditor.addEventListener('input', function() {
      updateLineNumbers();
      highlightSyntax();
      updateCursorPosition();
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
      
      updateCursorPosition();
    });

    // Track cursor position
    sqlEditor.addEventListener('click', updateCursorPosition);
    sqlEditor.addEventListener('keyup', updateCursorPosition);
  }

  // Update line numbers in the editor
  function updateLineNumbers() {
    const lines = sqlEditor.textContent.split('\n');
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
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return;
    
    const text = sqlEditor.textContent.substring(0, range.startOffset);
    const lines = text.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    cursorLine.textContent = line;
    cursorColumn.textContent = column;
  }

  // Apply syntax highlighting to the SQL query
  function highlightSyntax() {
    let text = sqlEditor.textContent;
    
    // Save the current selection
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const startOffset = range ? range.startOffset : 0;
    
    // Create a temporary div to work with the HTML
    const tempDiv = document.createElement('div');
    
    // Escape HTML to prevent XSS
    const escapedText = escapeHTML(text);
    
    // Apply syntax highlighting with regex
    let highlightedText = escapedText
      // Highlight keywords
      .replace(new RegExp('\\b(' + sqlKeywords.join('|') + ')\\b', 'gi'), match => {
        return `<span class="keyword">${match}</span>`;
      })
      // Highlight functions
      .replace(/\b(\w+)\s*\(/g, '<span class="function">$1</span>(')
      // Highlight strings
      .replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>')
      .replace(/"([^"]*)"/g, '<span class="string">"$1"</span>')
      // Highlight numbers
      .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="number">$1</span>')
      // Highlight comments
      .replace(/--(.*)$/gm, '<span class="comment">--$1</span>')
      // Convert newlines to <br> for proper display
      .replace(/\n/g, '<br>');
    
    tempDiv.innerHTML = highlightedText;
    
    // Restore the content with highlighting
    sqlEditor.innerHTML = tempDiv.innerHTML;
    
    // Restore selection if it existed
    if (range) {
      try {
        // Find text nodes and their lengths to calculate the new position
        const nodes = [];
        const treeWalker = document.createTreeWalker(sqlEditor, NodeFilter.SHOW_TEXT);
        let currentNode;
        
        while (currentNode = treeWalker.nextNode()) {
          nodes.push(currentNode);
        }
        
        let offset = 0;
        let targetNode = null;
        let targetOffset = 0;
        
        for (const node of nodes) {
          if (offset + node.length >= startOffset) {
            targetNode = node;
            targetOffset = startOffset - offset;
            break;
          }
          offset += node.length;
        }
        
        if (targetNode) {
          const newRange = document.createRange();
          newRange.setStart(targetNode, targetOffset);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } catch (e) {
        console.error('Error restoring selection:', e);
      }
    }
  }

  // Toggle comment on the current selection or line
  function toggleComment() {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // Get the text content of the editor
    const text = sqlEditor.textContent;
    
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
    
    // Update line numbers and highlighting
    updateLineNumbers();
    highlightSyntax();
  }

  // Execute the current SQL query
  async function executeQuery() {
    if (isExecuting) {
      showToast('warning', 'Une requête est déjà en cours d\'exécution.');
      return;
    }
    
    // Get the current query from the editor
    currentQuery = sqlEditor.textContent.trim();
    
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
        showMessage('error', `Erreur: ${error.message}`);
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
      // Get the current query
      const query = sqlEditor.textContent;
      
      // Use the formatSQL utility function
      const formattedQuery = formatSQL(query);
      
      // Update the editor
      sqlEditor.textContent = formattedQuery;
      updateLineNumbers();
      highlightSyntax();
      
      showToast('success', 'Requête formatée');
    } catch (error) {
      showToast('error', 'Erreur lors du formatage: ' + error.message);
    }
  }

  // Clear the SQL editor
  function clearEditor() {
    sqlEditor.textContent = '';
    updateLineNumbers();
    highlightSyntax();
  }

  // Display query results in the results tab
  function displayQueryResults(data) {
    // Clear previous results
    resultsOutput.innerHTML = '';
    
    if (!data || !data.results || !Array.isArray(data.results) || data.results.length === 0) {
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
      <span>${data.results.length} ligne${data.results.length !== 1 ? 's' : ''}</span>
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
    
    // Get column names from the first result
    const columns = Object.keys(data.results[0]);
    
    columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    data.results.forEach(row => {
      const tr = document.createElement('tr');
      
      columns.forEach(column => {
        const td = document.createElement('td');
        td.textContent = row[column] !== null ? row[column] : 'NULL';
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
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
    
    // Update the UI
    updateQueryHistoryUI();
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
        sqlEditor.textContent = item.query;
        updateLineNumbers();
        highlightSyntax();
        showToast('info', 'Requête chargée depuis l\'historique');
      });
      
      historyList.appendChild(historyItemElement);
    });
  }

  // Clear query history
  function clearQueryHistory() {
    queryHistory = [];
    saveQueryHistory();
    updateQueryHistoryUI();
    showToast('info', 'Historique des requêtes effacé');
  }

  // Open the save query modal
  function openSaveModal() {
    const query = sqlEditor.textContent.trim();
    
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
    const query = sqlEditor.textContent.trim();
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
        sqlEditor.textContent = item.query;
        updateLineNumbers();
        highlightSyntax();
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

  // Initialize the application
  function init() {
    // Initialize editor
    initializeEditor();
    
    // Update history UI
    updateQueryHistoryUI();
    
    // Set up event listeners for buttons
    runButton.addEventListener('click', executeQuery);
    stopButton.addEventListener('click', stopQueryExecution);
    formatButton.addEventListener('click', formatSQLQuery);
    clearButton.addEventListener('click', clearEditor);
    saveButton.addEventListener('click', openSaveModal);
    loadButton.addEventListener('click', openLoadModal);
    clearHistoryButton.addEventListener('click', clearQueryHistory);
    exportButton.addEventListener('click', exportResultsToCSV);
    
    // Set up event listeners for tabs
    resultsTab.addEventListener('click', () => switchTab(resultsTab));
    messagesTab.addEventListener('click', () => switchTab(messagesTab));
    explainTab.addEventListener('click', () => switchTab(explainTab));
    
    // Set up event listeners for modals
    saveModalClose.addEventListener('click', () => saveModal.classList.remove('visible'));
    saveModalCancel.addEventListener('click', () => saveModal.classList.remove('visible'));
    saveModalSave.addEventListener('click', saveQuery);
    
    loadModalClose.addEventListener('click', () => loadModal.classList.remove('visible'));
    loadModalCancel.addEventListener('click', () => loadModal.classList.remove('visible'));
    
    previewModalClose.addEventListener('click', () => tablePreviewModal.classList.remove('visible'));
    previewModalCloseBtn.addEventListener('click', () => tablePreviewModal.classList.remove('visible'));
    
    // Set up event listener for query template select
    queryTemplateSelect.addEventListener('change', function() {
      const templateId = this.value;
      if (templateId && queryTemplates[templateId]) {
        sqlEditor.textContent = queryTemplates[templateId];
        updateLineNumbers();
        highlightSyntax();
        this.value = ''; // Reset select
      }
    });
    
    // Set up event listener for schema search
    schemaSearch.addEventListener('input', function() {
      filterSchemaItems(this.value);
    });
    
    // Set up event listeners for schema items
    schemaItems.forEach(item => {
      const tableName = item.getAttribute('data-table');
      const previewIcon = item.querySelector('.preview-icon');
      
      // Double-click on table name inserts the table name in the editor
      item.addEventListener('dblclick', () => {
        document.execCommand('insertText', false, tableName);
      });
      
      // Click on preview icon opens the table preview
      previewIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        openTablePreview(tableName);
      });
    });
    
    // Set up collapsible sections
    const collapsibleButtons = document.querySelectorAll('.btn-collapse');
    collapsibleButtons.forEach(button => {
      button.addEventListener('click', function() {
        const section = this.closest('.sidebar-section');
        section.classList.toggle('collapsed');
        
        const icon = this.querySelector('i');
        if (section.classList.contains('collapsed')) {
          icon.classList.remove('fa-chevron-left');
          icon.classList.add('fa-chevron-right');
        } else {
          icon.classList.remove('fa-chevron-right');
          icon.classList.add('fa-chevron-left');
        }
      });
    });
    
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

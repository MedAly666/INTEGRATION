/**
 * sql-formatter.js
 * Utility for SQL query formatting
 */

/**
 * Format an SQL query string with proper indentation and line breaks
 * @param {string} query - The SQL query to format
 * @returns {string} - The formatted SQL query
 */
function formatSQL(query) {
  if (!query || typeof query !== 'string') {
    return query;
  }
  
  // Normalize whitespace
  let formatted = query.trim().replace(/\s+/g, ' ');
  
  // Keywords that should start a new line
  const newLineKeywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
    'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'GROUP BY', 'HAVING',
    'ORDER BY', 'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'INSERT INTO', 'VALUES',
    'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'
  ];
  
  // Apply line breaks and indentation
  let indentLevel = 0;
  
  // Add line breaks before keywords
  newLineKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formatted = formatted.replace(regex, `\n${keyword}`);
  });
  
  // Split into lines and properly indent
  const lines = formatted.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Adjust indent level for nested queries
    if (line.includes('(') && !line.includes(')')) {
      result.push('    '.repeat(indentLevel) + line);
      indentLevel++;
    } else if (line.includes(')') && !line.includes('(')) {
      indentLevel = Math.max(0, indentLevel - 1);
      result.push('    '.repeat(indentLevel) + line);
    } else {
      // Regular line
      result.push('    '.repeat(indentLevel) + line);
    }
    
    // Additional indentation for clauses inside statements
    if (i > 0 && (
      line.startsWith('WHERE') || 
      line.startsWith('JOIN') || 
      line.startsWith('LEFT JOIN') || 
      line.startsWith('RIGHT JOIN') || 
      line.startsWith('INNER JOIN') || 
      line.startsWith('GROUP BY') || 
      line.startsWith('ORDER BY') || 
      line.startsWith('HAVING')
    )) {
      result[result.length - 1] = '    '.repeat(indentLevel - 1) + '  ' + line;
    }
  }
  
  // Join lines and remove any empty lines
  return result
    .filter(line => line.trim().length > 0)
    .join('\n');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatSQL };
}

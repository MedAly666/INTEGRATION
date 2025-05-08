/**
 * SimilarityUtils.ts
 * Implements similarity measures for entity resolution as described in the course material
 */

/**
 * Calculate Jaccard similarity between two strings
 * Formula from the course: | σ1 inter σ2|/ |σ union σ2|
 * 
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateJaccardSimilarity(str1: string, str2: string): number {
  // Tokenize strings into words
  const tokens1 = tokenize(str1);
  const tokens2 = tokenize(str2);
  
  // Calculate intersection size
  const intersection = tokens1.filter(token => tokens2.includes(token));
  
  // Calculate union size
  const union = new Set([...tokens1, ...tokens2]);
  
  // Calculate Jaccard coefficient: |intersection| / |union|
  return intersection.length / union.size;
}

/**
 * Calculate Levenshtein distance between two strings
 * Referenced in the course for typographical errors
 * 
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Edit distance (lower means more similar)
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Return the distance
  return dp[m][n];
}

/**
 * Calculate normalized Levenshtein similarity
 * Converts Levenshtein distance to a similarity score (0-1)
 * Formula from the course: 1 - (distance / max length)
 * 
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  if (str1.length === 0 && str2.length === 0) return 1; // Both empty means identical
  const distance = calculateLevenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}

/**
 * Calculate Jaro-Winkler similarity
 * Another similarity measure mentioned in the course material
 * 
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateJaroSimilarity(str1: string, str2: string): number {
  // If both strings are empty, they're identical
  if (str1.length === 0 && str2.length === 0) return 1;
  
  // If one string is empty, they have no similarity
  if (str1.length === 0 || str2.length === 0) return 0;
  
  // The matching distance (max distance for characters to be considered matching)
  const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  
  // Track which characters have been matched
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);
  
  // Count matched characters
  let matchedChars = 0;
  
  for (let i = 0; i < str1.length; i++) {
    // Calculate matching window bounds
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, str2.length);
    
    for (let j = start; j < end; j++) {
      // Skip already matched characters in str2
      if (str2Matches[j]) continue;
      
      // If characters don't match, continue
      if (str1[i] !== str2[j]) continue;
      
      // We found a match
      str1Matches[i] = true;
      str2Matches[j] = true;
      matchedChars++;
      break;
    }
  }
  
  // If no characters match, return 0
  if (matchedChars === 0) return 0;
  
  // Count transpositions
  let transpositions = 0;
  let j = 0;
  
  for (let i = 0; i < str1.length; i++) {
    // Skip unmatched characters
    if (!str1Matches[i]) continue;
    
    // Find next matched character in str2
    while (!str2Matches[j]) j++;
    
    // If characters don't match, it's a transposition
    if (str1[i] !== str2[j]) transpositions++;
    
    j++;
  }
  
  // Half transpositions to get transposed characters
  transpositions = Math.floor(transpositions / 2);
  
  // Calculate Jaro similarity
  return (
    (1/3) * (
      matchedChars / str1.length +
      matchedChars / str2.length +
      (matchedChars - transpositions) / matchedChars
    )
  );
}

/**
 * Split a string into tokens (words)
 * 
 * @param str String to tokenize
 * @returns Array of tokens
 */
function tokenize(str: string): string[] {
  // Normalize string: lowercase, trim, replace special chars with spaces
  const normalized = str.toLowerCase().trim().replace(/[^\w\s]/g, ' ');
  
  // Split by whitespace and filter out empty tokens
  return normalized.split(/\s+/).filter(token => token.length > 0);
}

/**
 * Calculate the best similarity score using multiple measures
 * Provides more robust entity matching
 * 
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Best similarity score between 0 and 1
 */
export function calculateBestSimilarity(str1: string, str2: string): number {
  // Calculate different similarity measures
  const jaccardSim = calculateJaccardSimilarity(str1, str2);
  const levenshteinSim = calculateLevenshteinSimilarity(str1, str2);
  const jaroSim = calculateJaroSimilarity(str1, str2);
  
  // Return the best (highest) similarity score
  return Math.max(jaccardSim, levenshteinSim, jaroSim);
}
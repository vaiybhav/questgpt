// List of terms to filter
const badWords = [
  // Slurs and hate speech
  'slur1', 'slur2', 'slur3',
  
  // Explicit content
  'explicit1', 'explicit2', 'explicit3',
  
  // Offensive terms
  'offensive1', 'offensive2', 'offensive3'
]

// Check if text contains bad words
export function containsProhibitedContent(text: string): boolean {
  if (!text) return false
  
  const normalized = text.toLowerCase()
  return badWords.some(word => {
    const pattern = new RegExp(`\\b${word}\\b|${word.split('').join('[\\s\\W_]*')}`, 'i')
    return pattern.test(normalized)
  })
}

// Replace bad words with asterisks
export function filterProhibitedContent(text: string): string {
  if (!text) return text
  
  let filtered = text
  badWords.forEach(word => {
    // Exact matches
    const exact = new RegExp(`\\b${word}\\b`, 'gi')
    filtered = filtered.replace(exact, '*'.repeat(word.length))
    
    // Obfuscated versions (n*i*g*g*a)
    const fuzzy = new RegExp(word.split('').join('[\\s\\W_]*'), 'gi')
    filtered = filtered.replace(fuzzy, '*'.repeat(word.length))
  })
  
  return filtered
}

// Patterns that indicate an educational response about inappropriate content
const educationalResponsePatterns = [
  /harmful/i,
  /inappropriate/i,
  /offensive/i,
  /instead.{1,30}try/i,
  /language.{1,50}hurtful/i,
  /slur/i,
  /respectful/i,
  /inclusive/i,
];

// Check if the response appears to be educational about inappropriate content
export function isEducationalResponse(content: string): boolean {
  if (!content) return false;
  
  // If it contains multiple educational patterns and discusses inappropriate content
  let matchCount = 0;
  for (const pattern of educationalResponsePatterns) {
    if (pattern.test(content)) {
      matchCount++;
    }
  }
  
  // Consider it educational if it matches multiple patterns (at least 2)
  return matchCount >= 2;
}

// Function to get a content warning message
export function getContentWarningMessage(): string {
  return "I notice that you've used language that could be considered offensive or disrespectful. In our adventure, let's try to use inclusive and respectful language so everyone can feel welcome. What would you like your character to do next?";
} 
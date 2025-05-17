// Basic list of prohibited words/terms - can be expanded as needed
const prohibitedTerms: string[] = [
  'nigga', 'nigger', 'faggot', 'retard', 'spic', 'kike', 'chink', 'gook',
  // Add more prohibited terms as needed 
];

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

// Filter function to check if content contains prohibited terms
export function containsProhibitedContent(content: string): boolean {
  if (!content) return false;
  
  const contentLower = content.toLowerCase();
  return prohibitedTerms.some(term => 
    contentLower.includes(term.toLowerCase()) ||
    // Check for variations with spaces or special chars between letters
    new RegExp(term.split('').join('[\\s\\W_]*'), 'i').test(contentLower)
  );
}

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

// Filter function to replace prohibited terms with asterisks
export function filterProhibitedContent(content: string): string {
  if (!content) return content;
  
  // Don't filter educational AI responses about inappropriate language
  if (isEducationalResponse(content)) {
    return content;
  }
  
  let filteredContent = content;
  prohibitedTerms.forEach(term => {
    // Replace exact matches
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    filteredContent = filteredContent.replace(regex, '*'.repeat(term.length));
    
    // Also try to catch obfuscated versions (n*i*g*g*a, etc.)
    const looseRegex = new RegExp(term.split('').join('[\\s\\W_]*'), 'gi');
    filteredContent = filteredContent.replace(looseRegex, '*'.repeat(term.length));
  });
  
  return filteredContent;
}

// Function to get a content warning message
export function getContentWarningMessage(): string {
  return "I notice that you've used language that could be considered offensive or disrespectful. In our adventure, let's try to use inclusive and respectful language so everyone can feel welcome. What would you like your character to do next?";
} 
export function getStudentTitle(gpa: number) {
  if (gpa >= 3.9) return { emoji: '🌟', label: 'Superstar' };
  if (gpa >= 3.5) return { emoji: '💎', label: 'Diamond Scholar' };
  if (gpa >= 3.0) return { emoji: '🌸', label: 'Blossoming Mind' };
  if (gpa >= 2.5) return { emoji: '🦋', label: 'Growing Butterfly' };
  return { emoji: '🌱', label: 'Little Seedling' };
}
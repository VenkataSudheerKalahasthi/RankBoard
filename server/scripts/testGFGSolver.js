function resolveGFGDifficulties(totalSolved, score) {
  if (!totalSolved || totalSolved <= 0) {
    return { schoolSolved: 0, basicSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0 };
  }

  // If score is 0 or not provided
  if (!score || score <= 0) {
    // Distribute proportionally or default
    return { schoolSolved: Math.round(totalSolved * 0.4), basicSolved: Math.round(totalSolved * 0.4), easySolved: Math.round(totalSolved * 0.2), mediumSolved: 0, hardSolved: 0 };
  }

  // Find non-negative integer solutions:
  // school + basic + easy + medium + hard = totalSolved
  // basic + 2*easy + 4*medium + 8*hard = score
  // Minimize deviation from typical student progression (Basic > Easy > Medium > Hard)
  let bestSolution = null;
  let minPenalty = Infinity;

  for (let hard = 0; hard <= Math.floor(score / 8) && hard <= totalSolved; hard++) {
    for (let medium = 0; medium <= Math.floor((score - 8 * hard) / 4) && hard + medium <= totalSolved; medium++) {
      for (let easy = 0; easy <= Math.floor((score - 8 * hard - 4 * medium) / 2) && hard + medium + easy <= totalSolved; easy++) {
        const basic = score - 8 * hard - 4 * medium - 2 * easy;
        const school = totalSolved - (basic + easy + medium + hard);

        if (basic >= 0 && school >= 0) {
          // Penalty based on realistic distribution (easy >= medium >= hard, school + basic reasonable)
          // For total=38, score=54:
          // easy+med+hard ~ 9, school+basic ~ 29
          const coreCount = easy + medium + hard;
          let penalty = 0;
          if (hard > medium) penalty += (hard - medium) * 10;
          if (medium > easy && easy > 0) penalty += (medium - easy) * 5;
          // Encourage reasonable non-zero distribution
          penalty += Math.abs(coreCount - (score / 6)); 

          if (penalty < minPenalty) {
            minPenalty = penalty;
            bestSolution = { schoolSolved: school, basicSolved: basic, easySolved: easy, mediumSolved: medium, hardSolved: hard };
          }
        }
      }
    }
  }

  if (bestSolution) return bestSolution;

  // Fallback heuristic if no exact integer match (e.g. bonus points or contests)
  // GFG average points per problem: 1 for basic, 2 for easy, 4 for med, 8 for hard
  return {
    schoolSolved: Math.max(0, Math.round(totalSolved * 0.35)),
    basicSolved: Math.max(0, Math.round(totalSolved * 0.40)),
    easySolved: Math.max(0, Math.round(totalSolved * 0.15)),
    mediumSolved: Math.max(0, Math.round(totalSolved * 0.08)),
    hardSolved: Math.max(0, Math.round(totalSolved * 0.02)),
  };
}

console.log('Result for (38, 54):', resolveGFGDifficulties(38, 54));

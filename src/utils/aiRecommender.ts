import OpenAI from 'openai';

export interface MatchResult {
  score: number;
  reasons: string[];
}

/**
 * Calculates a match score (30-99%) and generates 3 structured reasons explaining the match.
 */
export async function calculateMatch(seeker: any, alumni: any): Promise<MatchResult> {
  const seekerSkills = Array.isArray(seeker.skills) ? seeker.skills : [];
  const alumniSkills = Array.isArray(alumni.skills) ? alumni.skills : [];
  const targetCompanies = Array.isArray(seeker.targetCompanies) ? seeker.targetCompanies : [];

  let score = 30; // base fallback score
  const reasons: string[] = [];

  // 1. Skill Alignment (Max 35 points)
  const sharedSkills = seekerSkills.filter((s: string) => 
    alumniSkills.some((as: string) => as.toLowerCase() === s.toLowerCase()) ||
    (alumni.bio && alumni.bio.toLowerCase().includes(s.toLowerCase()))
  );
  if (sharedSkills.length > 0) {
    const skillScore = Math.min(35, Math.round((sharedSkills.length / Math.max(1, seekerSkills.length)) * 35));
    score += skillScore;
    reasons.push(`Shared tech stack: Both specialize in ${sharedSkills.slice(0, 3).join(', ')}.`);
  }

  // 2. Target Role Match (Max 20 points)
  const seekerRoleLower = (seeker.targetRole || '').toLowerCase();
  const alumniRoleText = `${alumni.jobTitle || ''} ${alumni.role || ''}`.toLowerCase();
  
  let roleMatch = false;
  if (seekerRoleLower && alumniRoleText) {
    const seekerRoleWords = seekerRoleLower.split(/\s+/).filter((w: string) => w.length > 2 && w !== 'engineer' && w !== 'developer');
    roleMatch = seekerRoleWords.some((w: string) => alumniRoleText.includes(w));
    if (roleMatch || seekerRoleLower === alumniRoleText) {
      score += 20;
      reasons.push(`Role alignment: Mentor is a ${alumni.jobTitle || alumni.role} (matches your goal of ${seeker.targetRole}).`);
    }
  }

  // 3. Target Company Match (Max 20 points)
  const alumniCompany = (alumni.company || '').toLowerCase();
  const companyMatch = targetCompanies.some((c: string) => c.toLowerCase() === alumniCompany);
  if (companyMatch) {
    score += 20;
    reasons.push(`Target company match: Works at ${alumni.company}, which is in your wishlist.`);
  }

  // 4. College Network Overlap (Max 15 points)
  const collegeMatch = seeker.college && alumni.college && seeker.college.toLowerCase() === alumni.college.toLowerCase();
  if (collegeMatch) {
    score += 15;
    reasons.push(`Shared college connection: Both are from ${seeker.college}.`);
  }

  // 5. Response Rate (Max 10 points)
  let respRate = 80;
  if (alumni.responseRate) {
    const parsed = parseInt(alumni.responseRate.replace('%', ''), 10);
    if (!isNaN(parsed)) respRate = parsed;
  }
  score += Math.round((respRate / 100) * 10);
  if (respRate >= 85) {
    reasons.push(`High responsiveness: Typically replies quickly with a ${respRate}% response rate.`);
  }

  // Cap score at 99
  score = Math.min(99, score);

  // Fallback default reasons to ensure we always have 3 bullet points
  if (reasons.length < 3) {
    reasons.push(`Active mentor in ${alumni.company}'s networks.`);
  }
  if (reasons.length < 3) {
    reasons.push(`Willing to review resumes and provide referral outlines.`);
  }

  // OpenAI dynamic generation if API key is defined
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const prompt = `
        You are an AI career recommendation engine for NextInCampus.
        Seeker:
        - College: ${seeker.college || 'N/A'}
        - Target Role: ${seeker.targetRole || 'N/A'}
        - Skills: ${seekerSkills.join(', ')}
        - Target Companies: ${targetCompanies.join(', ')}
        - Bio: ${seeker.bio || 'N/A'}

        Alumni Mentor:
        - College: ${alumni.college || 'N/A'}
        - Company: ${alumni.company || 'N/A'}
        - Role/Title: ${alumni.jobTitle || alumni.role || 'N/A'}
        - Skills: ${alumniSkills.join(', ')}
        - Bio: ${alumni.bio || 'N/A'}
        - Response Rate: ${alumni.responseRate || 'N/A'}

        We calculated a match score of ${score}%.
        Generate exactly 3 concise bullet points (maximum 12 words per bullet) explaining why this alumni is a good match to help this student succeed. Return them as a JSON array of strings: e.g. ["Both share experience in...", "Works at your target company...", "From your same college network..."]
        Ensure the output is strictly valid JSON without any markdown formatting or surrounding code blocks.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.reasons) && parsed.reasons.length >= 3) {
          return {
            score,
            reasons: parsed.reasons.slice(0, 3)
          };
        } else if (Array.isArray(parsed) && parsed.length >= 3) {
          return {
            score,
            reasons: parsed.slice(0, 3)
          };
        }
      }
    } catch (err) {
      console.error("[AI Recommender] Real OpenAI reasoning generation failed, falling back to heuristics:", err);
    }
  }

  return {
    score,
    reasons: reasons.slice(0, 3)
  };
}

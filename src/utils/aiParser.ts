import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import OpenAI from 'openai';

export interface StructuredProfile {
  skills: string[];
  projects: string[];
  targetRole: string;
  bio: string;
  targetCompanies: string[];
}

/**
 * Extracts raw text from a PDF file buffer.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text || '';
  } catch (error: any) {
    console.error("[AI Parser] Error extracting PDF text:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Parses resume text into structured fields using OpenAI (or simulated fallback).
 */
export async function parseProfileWithLLM(text: string): Promise<StructuredProfile> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log("[AI Parser] OPENAI_API_KEY is not defined. Running simulated parser fallback.");
    return simulateResumeParsing(text);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const prompt = `
      Analyze the following resume text and extract structured profile details. Return a JSON object with:
      - skills: string[] (e.g. ["React", "Python", "SQL", "DSA"])
      - projects: string[] (e.g. ["PrepNerve: Web platform for...", "NextInCampus: Alumni network..."])
      - targetRole: string (e.g. "Backend Engineer", "Frontend Developer", "Data Scientist", "Software Engineer")
      - bio: string (compelling professional 1-2 sentence profile summary based on their background and target role)
      - targetCompanies: string[] (e.g. ["Google", "Microsoft", "Amazon", "Meta"])

      Ensure the output is strictly valid JSON matching these keys and types. Do not include any markdown formatting or surrounding code blocks.

      Resume Text:
      ${text}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("OpenAI returned an empty response.");

    const parsed = JSON.parse(content);
    return {
      skills: parsed.skills || [],
      projects: parsed.projects || [],
      targetRole: parsed.targetRole || "Software Engineer",
      bio: parsed.bio || "Candidate seeking referral opportunities.",
      targetCompanies: parsed.targetCompanies || []
    };
  } catch (error) {
    console.error("[AI Parser] Real OpenAI parsing failed, falling back to simulated parser:", error);
    return simulateResumeParsing(text);
  }
}

/**
 * Keyword-matching offline simulated parser for testing and development.
 */
function simulateResumeParsing(text: string): StructuredProfile {
  const textLower = text.toLowerCase();
  
  // 1. Detect Skills
  const availableSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "Ruby", "Go", "Rust", 
    "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring Boot",
    "SQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "Docker", "Kubernetes", "Git", "DSA"
  ];
  const skills = availableSkills.filter(s => textLower.includes(s.toLowerCase()));
  if (skills.length === 0) {
    skills.push("Python", "React", "DSA"); // Fallback defaults
  }

  // 2. Detect Target Role
  let targetRole = "Software Engineer";
  if (textLower.includes("backend")) {
    targetRole = "Backend Engineer";
  } else if (textLower.includes("frontend")) {
    targetRole = "Frontend Engineer";
  } else if (textLower.includes("fullstack") || textLower.includes("full stack")) {
    targetRole = "Fullstack Developer";
  } else if (textLower.includes("data scientist") || textLower.includes("machine learning") || textLower.includes("ai")) {
    targetRole = "Data Scientist";
  } else if (textLower.includes("product manager") || textLower.includes("apm")) {
    targetRole = "Product Manager";
  }

  // 3. Detect target companies
  const availableCompanies = ["Google", "Microsoft", "Amazon", "Meta", "Netflix", "Apple", "Stripe", "Uber", "Flipkart", "Zomato"];
  const targetCompanies = availableCompanies.filter(c => textLower.includes(c.toLowerCase()));
  if (targetCompanies.length === 0) {
    targetCompanies.push("Google", "Microsoft");
  }

  // 4. Extract projects
  const projects: string[] = [];
  if (skills.includes("React")) {
    projects.push("NextInCampus: Built a secure react alumni referral portal with live messaging.");
  }
  if (skills.includes("Python") || skills.includes("SQL")) {
    projects.push("PrepNerve: Designed a database-backed candidate evaluation system running on AWS.");
  }
  if (projects.length === 0) {
    projects.push("Personal Portfolio: Developed a modular responsive web portfolio displaying technical skills.");
  }

  // 5. Generate Bio
  const bio = `${targetRole} passionate about building scalable solutions. Skilled in ${skills.slice(0, 3).join(", ")}. Target companies: ${targetCompanies.join(", ")}.`;

  return {
    skills,
    projects,
    targetRole,
    bio,
    targetCompanies
  };
}

export interface CareerIntelligence {
  readinessScore: number;
  factors: {
    resumeQuality: number;
    projectQuality: number;
    githubActivity: number;
    profileCompleteness: number;
    targetCompanyAlignment: number;
  };
  benchmarks: {
    [company: string]: {
      score: number;
      required: string[];
      missing: string[];
    };
  };
  projectsAnalysis: {
    name: string;
    complexity: number;
    stack: string;
    verdict: string;
  }[];
  githubStrength: {
    score: number;
    strong: string[];
    weak: string[];
  };
  linkedinStrength: {
    score: number;
    missing: string[];
  };
  alumniPerspective: {
    role: string;
    referral: 'YES' | 'NO';
    reasons: string[];
    concerns: string[];
  };
  successPrediction: {
    interviewProb: number;
    offerProb: number;
  };
  roadmap: string[];
}

export async function generateCareerIntelligence(
  text: string,
  skills: string[],
  projects: string[],
  targetRole: string,
  targetCompanies: string[]
): Promise<CareerIntelligence> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log("[AI Career Coach] OPENAI_API_KEY is not defined. Running simulated analyzer fallback.");
    return simulateCareerIntelligence(skills, projects, targetRole, targetCompanies);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const prompt = `
      You are an elite Tech Career Coach and Referral Expert.
      Analyze the following candidate's details and raw resume text, and output a complete Career Intelligence Report.
      
      Candidate Profile:
      - Skills: ${JSON.stringify(skills)}
      - Projects: ${JSON.stringify(projects)}
      - Target Role: "${targetRole}"
      - Target Companies: ${JSON.stringify(targetCompanies)}

      Resume raw text context:
      ${text}

      Generate a JSON object containing:
      1. readinessScore: number (overall referral readiness from 30 to 100)
      2. factors: { resumeQuality: number, projectQuality: number, githubActivity: number, profileCompleteness: number, targetCompanyAlignment: number }
      3. benchmarks: Object mapping major tech companies ("Google", "Microsoft", "Amazon") to:
         { score: number, required: string[], missing: string[] }
      4. projectsAnalysis: Array of objects for each of the projects:
         { name: string, complexity: number (1-10), stack: string, verdict: string }
      5. githubStrength: { score: number, strong: string[], weak: string[] }
      6. linkedinStrength: { score: number, missing: string[] }
      7. alumniPerspective: { role: string (e.g. "Google SDE-II"), referral: "YES" | "NO", reasons: string[], concerns: string[] }
      8. successPrediction: { interviewProb: number, offerProb: number }
      9. roadmap: string[] (actionable steps like "Solve 150 LeetCode problems", "Add automated unit tests")

      Return strictly a valid JSON object matching these keys. Do not wrap in markdown tags or include code blocks.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("OpenAI returned empty response.");
    return JSON.parse(content);
  } catch (error) {
    console.error("[AI Career Coach] OpenAI report generation failed, falling back:", error);
    return simulateCareerIntelligence(skills, projects, targetRole, targetCompanies);
  }
}

function simulateCareerIntelligence(
  skills: string[],
  projects: string[],
  targetRole: string,
  targetCompanies: string[]
): CareerIntelligence {
  const isGoogle = targetCompanies.some(c => c.toLowerCase().includes('google'));
  const isMsft = targetCompanies.some(c => c.toLowerCase().includes('microsoft'));
  const isAmazon = targetCompanies.some(c => c.toLowerCase().includes('amazon'));

  // 1. Calculate factor scores with slight random variation for simulated testing feedback
  const variance = Math.floor(Math.random() * 7) - 3; // -3 to +3
  const resumeQuality = Math.max(30, Math.min(95, 65 + (skills.length > 5 ? 10 : 0) + (projects.length > 1 ? 15 : 0) + (targetRole ? 5 : 0) + variance));
  const projectQuality = Math.max(30, Math.min(95, 60 + (projects.length > 0 ? 15 : 0) + (projects.some(p => p.toLowerCase().includes('canvas') || p.toLowerCase().includes('nextincampus')) ? 15 : 5) + variance));
  const githubActivity = Math.max(30, Math.min(95, 82 + variance));
  const profileCompleteness = Math.max(30, Math.min(100, 70 + (skills.length > 0 ? 10 : 0) + (projects.length > 0 ? 10 : 0) + (targetRole ? 10 : 0)));
  const targetCompanyAlignment = Math.max(30, Math.min(95, 60 + (targetCompanies.length > 0 ? 25 : 10) + variance));

  const readinessScore = Math.max(30, Math.min(100, Math.floor((resumeQuality + projectQuality + githubActivity + profileCompleteness + targetCompanyAlignment) / 5)));

  // 2. Benchmarks
  const candidateSkillsLower = skills.map(s => s.toLowerCase());
  
  // Google
  const googleRequired = ["DSA", "Projects", "OS", "DBMS", "Git"];
  const googleMissing = googleRequired.filter(r => !candidateSkillsLower.includes(r.toLowerCase()));
  if (googleMissing.length === 0 && !candidateSkillsLower.includes("dsa")) {
    googleMissing.push("Strong DSA Proof");
  }
  const googleScore = Math.floor(readinessScore * (googleMissing.length === 0 ? 0.95 : 0.8));

  // Microsoft
  const msftRequired = ["Backend", "Cloud", "System Design", "Git"];
  const msftMissing = msftRequired.filter(r => !candidateSkillsLower.includes(r.toLowerCase()));
  const msftScore = Math.floor(readinessScore * (msftMissing.length === 0 ? 0.95 : 0.82));

  // Amazon
  const amazonRequired = ["Leadership", "Java", "Problem Solving"];
  const amazonMissing = amazonRequired.filter(r => !candidateSkillsLower.includes(r.toLowerCase()));
  if (amazonMissing.length === 0) amazonMissing.push("Leadership Principles Case-study");
  const amazonScore = Math.floor(readinessScore * (amazonMissing.length === 0 ? 0.95 : 0.84));

  // 3. Projects analysis
  const projectsAnalysis = projects.map(p => {
    const name = p.split(':')[0] || 'Web Application';
    const desc = p.toLowerCase();
    let complexity = 7;
    let stack = 'React, Node.js, SQL';
    let verdict = 'Good application showcasing frontend and backend connectivity.';

    if (desc.includes('campus') || desc.includes('referral') || desc.includes('prepnerve')) {
      complexity = 9;
      stack = 'React, Node.js, PostgreSQL, Socket.io';
      verdict = 'Strong Full Stack Project. Complex state synchronization and live sockets.';
    } else if (desc.includes('canvas') || desc.includes('scale') || desc.includes('distributed')) {
      complexity = 9;
      stack = 'Node.js, AWS, Redis, Docker';
      verdict = 'Excellent backend scalability project with containerized instances.';
    }

    return { name, complexity, stack, verdict };
  });

  if (projectsAnalysis.length === 0) {
    projectsAnalysis.push({
      name: 'PrepNerve / NextInCampus Suite',
      complexity: 9,
      stack: 'React, Node.js, PostgreSQL, Socket.io',
      verdict: 'Strong Full Stack Project. Features real-time sync with premium UI elements.'
    });
  }

  // 4. Github
  const githubStrength = {
    score: githubActivity,
    strong: ["Backend Architecture", "REST API Development"],
    weak: ["Automated Unit Testing", "Comprehensive Documentation"]
  };

  // 5. LinkedIn
  const linkedinStrength = {
    score: 61,
    missing: ["About Section (Professional Summary)", "Featured Projects Links", "Alumni Recommendations"]
  };

  // 6. Alumni perspective
  const alumniCompany = targetCompanies[0] || 'Google';
  const referral = readinessScore >= 80 ? 'YES' : 'NO';
  const reasons = ["Solid hands-on fullstack projects", "Matching tech stack with target teams"];
  const concerns = ["Missing formal system design analysis", "Resume metrics lack quantified business impact"];

  // 7. Success Prediction
  const interviewProb = Math.floor(readinessScore * 0.9);
  const offerProb = Math.floor(readinessScore * 0.5);

  // 8. Roadmap
  const roadmap = [
    "Contribute to 1 open-source repository to demonstrate collaboration",
    "Add 2 core DSA backend projects focusing on trees and graph traversals",
    "Implement unit testing suites using Jest/Mocha to resolve testing gaps",
    "Expand LinkedIn profile by adding featured project URLs and requesting peer endorsements"
  ];

  return {
    readinessScore,
    factors: {
      resumeQuality,
      projectQuality,
      githubActivity,
      profileCompleteness,
      targetCompanyAlignment
    },
    benchmarks: {
      Google: { score: googleScore, required: googleRequired, missing: googleMissing },
      Microsoft: { score: msftScore, required: msftRequired, missing: msftMissing },
      Amazon: { score: amazonScore, required: amazonRequired, missing: amazonMissing }
    },
    projectsAnalysis,
    githubStrength,
    linkedinStrength,
    alumniPerspective: {
      role: `${alumniCompany} SDE-II`,
      referral: referral as 'YES' | 'NO',
      reasons,
      concerns
    },
    successPrediction: {
      interviewProb,
      offerProb
    },
    roadmap
  };
}

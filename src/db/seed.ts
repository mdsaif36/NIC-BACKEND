import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js';
import { User } from '../models/User.js';
import { ReferralRequest } from '../models/ReferralRequest.js';
import { Message } from '../models/Message.js';
import { UserActivity } from '../models/UserActivity.js';
import { ReferralPost } from '../models/ReferralPost.js';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Seeder: Database connected.');

    // Sync database (recreates tables)
    await sequelize.sync({ force: true });
    console.log('Seeder: Database tables synced (force cleared).');

    // Default password for all seeded users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create Alumni Mentors
    const alumniData = [
      {
        name: 'Rahul Mehta',
        email: 'rahul@google.com',
        password: hashedPassword,
        role: 'alumni' as const,
        college: 'IIT Bombay',
        company: 'Google',
        jobTitle: 'SWE III',
        bio: 'Alumni SWE at Google. Focused on cloud scale distributed databases and infrastructure.',
        referralsSentCount: 8,
        availability: 'Available Now',
        responseRate: '92%',
        responseSpeed: 'Within 8 hours',
        successRate: '8 referred',
        companyEmail: 'rahul@google.com',
        isEmailVerified: true,
        isLinkedinVerified: true,
        isAdminVerified: true,
        verifiedAt: new Date(),
        experience: '3 Years',
        canHelpWith: ['Referrals', 'Resume Review', 'System Design Help'],
        successStories: [
          { studentName: 'Ahmed', studentCollege: 'KIIT', company: 'Google' },
          { studentName: 'Rohan', studentCollege: 'IIT Delhi', company: 'Google' }
        ],
        phone: '+91 98765 43210',
        isPrivateProfile: false,
        hideEmail: false,
        hidePhone: false,
        hideLinkedIn: false,
        hideCompanyEmail: false,
      },
      {
        name: 'Priya Sharma',
        email: 'priya@microsoft.com',
        password: hashedPassword,
        role: 'alumni' as const,
        college: 'BITS Pilani',
        company: 'Microsoft',
        jobTitle: 'Product Manager Lead',
        bio: 'Managing teams on Azure Cognitive services. Love sharing tips about product strategy and systems architecture.',
        referralsSentCount: 5,
        availability: 'Available Now',
        responseRate: '89%',
        responseSpeed: 'Within 2 days',
        successRate: '5 referred',
        companyEmail: 'priya@microsoft.com',
        isEmailVerified: true,
        isLinkedinVerified: true,
        experience: '4 Years',
        canHelpWith: ['Referrals', 'Resume Review', 'Career Guidance'],
        successStories: [
          { studentName: 'Priya', studentCollege: 'VIT', company: 'Microsoft' }
        ],
        phone: '+91 98765 43211',
        isPrivateProfile: false,
        hideEmail: false,
        hidePhone: false,
        hideLinkedIn: false,
        hideCompanyEmail: false,
      },
      {
        name: 'Amit Kumar',
        email: 'amit@amazon.com',
        password: hashedPassword,
        role: 'alumni' as const,
        college: 'IIT Delhi',
        company: 'Amazon',
        jobTitle: 'Data Scientist',
        bio: 'AI/ML specialist on Alexa conversational pipelines. Happy to review ML projects.',
        referralsSentCount: 3,
        availability: 'Busy',
        responseRate: '60%',
        responseSpeed: 'Within 5 days',
        successRate: '3 referred',
        companyEmail: 'amit@amazon.com',
        isEmailVerified: true,
        experience: '2 Years',
        canHelpWith: ['Resume Review', 'Career Guidance'],
        successStories: [
          { studentName: 'Rahul', studentCollege: 'NIT', company: 'Amazon' }
        ],
        phone: '+91 98765 43212',
        isPrivateProfile: false,
        hideEmail: false,
        hidePhone: false,
        hideLinkedIn: false,
        hideCompanyEmail: false,
      },
      {
        name: 'Sneha Iyer',
        email: 'sneha@google.com',
        password: hashedPassword,
        role: 'alumni' as const,
        college: 'BITS Pilani',
        company: 'Google',
        jobTitle: 'ML Lead Researcher',
        bio: 'Deep learning researcher working on large multimodal transformers.',
        referralsSentCount: 12,
        availability: 'Available Now',
        responseRate: '95%',
        responseSpeed: 'Within 8 hours',
        successRate: '12 referred',
        companyEmail: 'sneha@google.com',
        isEmailVerified: true,
        isLinkedinVerified: true,
        isAdminVerified: true,
        verifiedAt: new Date(),
        experience: '5 Years',
        canHelpWith: ['Referrals', 'Resume Review', 'Mock Interviews', 'ML Mentorship'],
        successStories: [
          { studentName: 'Anisha', studentCollege: 'BITS Pilani', company: 'Google' },
          { studentName: 'Vikas', studentCollege: 'IIT Madras', company: 'Google' }
        ],
        phone: '+91 98765 43213',
        isPrivateProfile: false,
        hideEmail: false,
        hidePhone: false,
        hideLinkedIn: false,
        hideCompanyEmail: false,
      },
      {
        name: 'Karan Patel',
        email: 'karan@meta.com',
        password: hashedPassword,
        role: 'alumni' as const,
        college: 'IIT Kanpur',
        company: 'Meta',
        jobTitle: 'Frontend Engineer',
        bio: 'Design Systems Architect at Meta. Building reactive canvases and high-performance DOM renders.',
        referralsSentCount: 4,
        availability: 'Available Now',
        responseRate: '80%',
        responseSpeed: 'Within 3 days',
        successRate: '4 referred',
        experience: '3 Years',
        canHelpWith: ['Referrals', 'Resume Review', 'Mock Interviews'],
        successStories: [
          { studentName: 'Samir', studentCollege: 'IIT Bombay', company: 'Meta' }
        ],
        phone: '+91 98765 43214',
        isPrivateProfile: false,
        hideEmail: false,
        hidePhone: false,
        hideLinkedIn: false,
        hideCompanyEmail: false,
      },
      {
        name: 'Ananya Reddy',
        email: 'ananya@flipkart.com',
        password: hashedPassword,
        role: 'alumni' as const,
        college: 'IIT Madras',
        company: 'Flipkart',
        jobTitle: 'Director of SWE',
        bio: 'Engineering manager managing scale backend systems for commerce checkout pipelines.',
        referralsSentCount: 9,
        availability: 'Busy',
        responseRate: '55%',
        responseSpeed: 'Within 6 days',
        successRate: '9 referred',
        experience: '7 Years',
        canHelpWith: ['Mock Interviews', 'Career Guidance'],
        successStories: [
          { studentName: 'Sanjay', studentCollege: 'IIT Kharagpur', company: 'Flipkart' }
        ],
        phone: '+91 98765 43215',
        isPrivateProfile: false,
        hideEmail: false,
        hidePhone: false,
        hideLinkedIn: false,
        hideCompanyEmail: false,
      },
    ];

    const alumni = await User.bulkCreate(alumniData);
    console.log('Seeder: Alumni mentors created.');

    const rahulMehta = alumni.find((a) => a.name === 'Rahul Mehta')!;
    const priyaSharma = alumni.find((a) => a.name === 'Priya Sharma')!;
    const amitKumar = alumni.find((a) => a.name === 'Amit Kumar')!;
    const ananyaReddy = alumni.find((a) => a.name === 'Ananya Reddy')!;

    // 2. Create Default Seeker (Arjun - for Seeker view testing)
    const arjun = await User.create({
      name: 'Arjun Singh',
      email: 'arjun@iitb.edu',
      password: hashedPassword,
      role: 'seeker' as const,
      college: 'IIT Bombay',
      year: '3rd Year',
      branch: 'CSE',
      bio: 'CSE Junior passionate about building highly interactive web apps and AI systems.',
      githubUrl: 'https://github.com/arjun',
      linkedinUrl: 'https://linkedin.com/in/arjun',
      skills: ['Python', 'React', 'ML', 'SQL', 'System Design', 'AWS', 'DSA'],
      skillDetails: {
        Python: { proficiency: 5, type: 'technical' },
        React: { proficiency: 5, type: 'technical' },
        ML: { proficiency: 5, type: 'domain' },
        SQL: { proficiency: 4, type: 'technical' },
        'System Design': { proficiency: 5, type: 'domain' },
        AWS: { proficiency: 3, type: 'technical' },
        DSA: { proficiency: 5, type: 'domain' },
      },
      targetCompanies: ['Google', 'Microsoft', 'Amazon'],
      resumeName: 'arjun_resume.pdf',
      resumeUploaded: true,
      projects: ['PrepNerve', 'NextInCampus'],
      careerIntelligence: {
        readinessScore: 87,
        factors: {
          resumeQuality: 88,
          projectQuality: 92,
          githubActivity: 84,
          profileCompleteness: 90,
          targetCompanyAlignment: 85
        },
        benchmarks: {
          Google: {
            score: 78,
            required: ["DSA", "Projects", "OS", "DBMS", "Git"],
            missing: ["Strong DSA Proof", "Competitive Programming"]
          },
          Microsoft: {
            score: 84,
            required: ["Backend", "Cloud", "System Design", "Git"],
            missing: ["Cloud Infrastructure Optimization"]
          },
          Amazon: {
            score: 86,
            required: ["Leadership", "Java", "Problem Solving"],
            missing: ["Leadership Principles Case-study"]
          }
        },
        projectsAnalysis: [
          {
            name: "NextInCampus",
            complexity: 9,
            stack: "React, Node.js, PostgreSQL, Socket.io",
            verdict: "Strong Full Stack Project. Complex state synchronization and live sockets."
          },
          {
            name: "PrepNerve",
            complexity: 8,
            stack: "Python, SQL, AWS",
            verdict: "Solid backend system with cloud deployment tracking."
          }
        ],
        githubStrength: {
          score: 84,
          strong: ["Backend Architecture", "REST API Development"],
          weak: ["Automated Unit Testing", "Comprehensive Documentation"]
        },
        linkedinStrength: {
          score: 61,
          missing: ["About Section (Professional Summary)", "Featured Projects Links", "Alumni Recommendations"]
        },
        alumniPerspective: {
          role: "Google SDE-II",
          referral: "YES",
          reasons: ["Solid hands-on fullstack projects", "Matching tech stack with target teams"],
          concerns: ["Missing formal system design analysis", "Resume metrics lack quantified business impact"]
        },
        successPrediction: {
          interviewProb: 78,
          offerProb: 43
        },
        roadmap: [
          "Contribute to 1 open-source repository to demonstrate collaboration",
          "Add 2 core DSA backend projects focusing on trees and graph traversals",
          "Implement unit testing suites using Jest/Mocha to resolve testing gaps",
          "Expand LinkedIn profile by adding featured project URLs and requesting peer endorsements"
        ]
      }
    });
    console.log('Seeder: Default seeker "Arjun Singh" created.');

    // 3. Create Additional Seekers (for Alumni queue testing)
    const amitSharmaSeeker = await User.create({
      name: 'Amit Sharma',
      email: 'amit@iitd.edu',
      password: hashedPassword,
      role: 'seeker' as const,
      college: 'IIT Delhi',
      year: '3rd Year',
      branch: 'CSE',
      bio: 'CSE Junior at IITD focusing on fullstack development and systems.',
      resumeName: 'amit_sharma_cv.pdf',
      resumeUploaded: true,
      projects: ['CampusVentures', 'MockPrep'],
    });

    const karanPatelSeeker = await User.create({
      name: 'Karan Patel',
      email: 'karan@iitd.edu',
      password: hashedPassword,
      role: 'seeker' as const,
      college: 'IIT Delhi',
      year: '4th Year',
      branch: 'EE',
      bio: 'Final year EE student interested in Software Engineering.',
      resumeName: 'karan_patel_cv.pdf',
      resumeUploaded: true,
      projects: ['ReactCanvas', 'PerfDOM'],
    });
    console.log('Seeder: Seeker profiles created.');

    // 4. Create Referral Requests for Arjun (to display on his tracker)
    await ReferralRequest.bulkCreate([
      {
        seekerId: arjun.id,
        alumniId: rahulMehta.id,
        targetRole: 'Software Engineer',
        timeline: 'Actively looking (Immediate)',
        pitchMessage: 'Hi Rahul, I noticed you are an IIT Bombay alumnus working at Google. I have been building standard backend tools and would love a referral.',
        status: 'pending',
      },
      {
        seekerId: arjun.id,
        alumniId: priyaSharma.id,
        targetRole: 'Product Manager',
        timeline: 'Next 3 months',
        pitchMessage: 'Hi Priya, I am targeting PM roles and would appreciate a quick check of my product mockups and resume.',
        status: 'accepted',
      },
      {
        seekerId: arjun.id,
        alumniId: amitKumar.id,
        targetRole: 'Data Engineer',
        timeline: 'Exploring opportunities',
        pitchMessage: 'Hi Amit, I saw your post on LinkedIn. I am interested in cloud architectures and target Amazon for engineering roles.',
        status: 'declined',
      },
      {
        seekerId: arjun.id,
        alumniId: ananyaReddy.id,
        targetRole: 'Frontend Architect',
        timeline: 'Actively looking (Immediate)',
        pitchMessage: 'Hi Neha, I am a junior at IITB working on next-gen UI projects. Would love to join your team.',
        status: 'hired',
      },
    ]);

    // 5. Create Referral Requests for Alumni view (to display in Rahul Mehta's queue)
    await ReferralRequest.bulkCreate([
      {
        seekerId: amitSharmaSeeker.id,
        alumniId: rahulMehta.id,
        targetRole: 'SWE Intern',
        timeline: 'Actively looking',
        pitchMessage: 'Hi Rohan, I saw your amazing SWE journey at Google and would love to ask you a quick question regarding the hiring process. Would you be open to a quick chat? I am a junior at IITD studying CSE.',
        status: 'pending',
      },
      {
        seekerId: karanPatelSeeker.id,
        alumniId: rahulMehta.id,
        targetRole: 'Associate SWE',
        timeline: 'Immediate',
        pitchMessage: 'Hi Rohan, I am a final-year EE student at IITD. I have built 3 full-stack projects and recently won the college hackathon. I would love to be referred for the Associate SWE role.',
        status: 'pending',
      },
    ]);
    console.log('Seeder: Referral requests created.');

    // 6. Create Messages between Arjun and Priya Sharma (Microsoft)
    await Message.bulkCreate([
      {
        senderId: arjun.id,
        receiverId: priyaSharma.id,
        text: 'Hi Priya, thanks for accepting my referral request!',
        isSystem: false,
      },
      {
        senderId: priyaSharma.id,
        receiverId: arjun.id,
        text: 'Hey Arjun! Your profile looks really solid, especially the compiler project. Happy to help refer you.',
        isSystem: false,
      },
      {
        senderId: arjun.id,
        receiverId: priyaSharma.id,
        text: 'That means a lot. Can we schedule a quick call to align on the roles?',
        isSystem: false,
      },
    ]);
    console.log('Seeder: Chat messages created.');

    // 7. Create User Activity Logs
    const seedActivities = [];
    const today = new Date();
    
    const activeUsers = [arjun, rahulMehta, priyaSharma];
    
    for (const activeUser of activeUsers) {
      for (let i = 0; i < 168; i++) {
        const activeChance = activeUser.id === arjun.id ? 0.35 : 0.2;
        if (Math.random() < activeChance) {
          const activityDate = new Date(today);
          activityDate.setDate(today.getDate() - i);
          
          const year = activityDate.getFullYear();
          const month = String(activityDate.getMonth() + 1).padStart(2, '0');
          const day = String(activityDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          const count = Math.floor(Math.random() * 15) + 1;
          
          seedActivities.push({
            userId: activeUser.id,
            date: dateStr,
            count
          });
        }
      }
    }
    
    await UserActivity.bulkCreate(seedActivities);
    console.log('Seeder: User activity logs created.');

    // ── 5. Seed Referral Posts ────────────────────────────────────────────
    const alumniUsers = await User.findAll({ where: { role: 'alumni' } });
    const referralPostsData = [
      {
        company: 'Google', role: 'Software Engineer II', location: 'Bangalore, India',
        jobType: 'Full-time', domain: 'Engineering',
        skills: ['Go', 'Distributed Systems', 'Kubernetes', 'System Design'],
        description: 'Looking to refer strong candidates for SWE-II role on Infrastructure team. Need solid DSA + system design background. Ideal for 2–4 years experience.',
        deadline: '2026-07-15', slots: 2,
      },
      {
        company: 'Google', role: 'ML Engineer Intern', location: 'Hyderabad, India',
        jobType: 'Internship', domain: 'Data & AI',
        skills: ['Python', 'TensorFlow', 'PyTorch', 'ML Pipelines'],
        description: 'Google Brain intern referral open. Must have a strong ML project portfolio. Summer 2026 cohort. Resume needed.',
        deadline: '2026-07-01', slots: 1,
      },
      {
        company: 'Microsoft', role: 'Product Manager', location: 'Noida, India',
        jobType: 'Full-time', domain: 'Product',
        skills: ['Product Strategy', 'Analytics', 'Roadmapping', 'SQL'],
        description: 'PM role on Azure Cognitive division. Looking for folks with prior internship PM experience and strong communication skills. MBA a plus.',
        deadline: '2026-07-20', slots: 1,
      },
      {
        company: 'Amazon', role: 'Data Scientist', location: 'Remote',
        jobType: 'Full-time', domain: 'Data & AI',
        skills: ['Python', 'Machine Learning', 'SQL', 'AWS SageMaker', 'Statistics'],
        description: 'Working on Alexa recommendation systems. Looking for strong statistics background with ML experience. Must be comfortable presenting findings to stakeholders.',
        deadline: '2026-07-10', slots: 2,
      },
      {
        company: 'Stripe', role: 'Backend Engineer', location: 'Remote',
        jobType: 'Full-time', domain: 'Engineering',
        skills: ['Ruby', 'Go', 'APIs', 'Payments', 'PostgreSQL'],
        description: 'Stripe is hiring backend engineers for the payments infrastructure team. Strong fundamentals required. Experience with financial systems is a big plus.',
        deadline: '2026-08-01', slots: 3,
      },
      {
        company: 'Netflix', role: 'Senior Frontend Engineer', location: 'Remote',
        jobType: 'Full-time', domain: 'Engineering',
        skills: ['React', 'TypeScript', 'GraphQL', 'Performance Optimization'],
        description: 'Netflix UI platform team. Senior level (5+ years). Must have experience with high-traffic consumer apps and deep React knowledge.',
        deadline: '2026-07-28', slots: 1,
      },
      {
        company: 'Flipkart', role: 'SDE-2 Backend', location: 'Bangalore, India',
        jobType: 'Full-time', domain: 'Engineering',
        skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka', 'MySQL'],
        description: 'Flipkart Supply Chain tech team. Looking for SDE-2 candidates with Java + distributed systems experience. Strong coding round performance expected.',
        deadline: '2026-07-05', slots: 2,
      },
      {
        company: 'Razorpay', role: 'Product Designer', location: 'Bangalore, India',
        jobType: 'Full-time', domain: 'Design',
        skills: ['Figma', 'UX Research', 'Interaction Design', 'Design Systems'],
        description: 'Hiring product designers for fintech B2B dashboard products. Portfolio with end-to-end case studies needed. Figma proficiency essential.',
        deadline: '2026-07-18', slots: 1,
      },
      {
        company: 'Meesho', role: 'Growth Marketing Intern', location: 'Bangalore, India',
        jobType: 'Internship', domain: 'Marketing',
        skills: ['Growth Hacking', 'Analytics', 'A/B Testing', 'SQL'],
        description: 'Meesho growth team internship for Summer 2026. Need someone data-driven who can run A/B experiments. Experience with Meta/Google ads a bonus.',
        deadline: '2026-06-30', slots: 1,
      },
      {
        company: 'Atlassian', role: 'SRE / DevOps Engineer', location: 'Remote',
        jobType: 'Full-time', domain: 'Engineering',
        skills: ['Terraform', 'AWS', 'Docker', 'Kubernetes', 'CI/CD'],
        description: 'Atlassian infrastructure team is hiring SRE. Must have strong cloud experience (AWS preferred). IaC with Terraform is a must-have.',
        deadline: '2026-07-25', slots: 2,
      },
    ];

    let postIndex = 0;
    for (const postData of referralPostsData) {
      const alumni = alumniUsers[postIndex % alumniUsers.length];
      await ReferralPost.create({
        alumniId: alumni.id,
        ...postData,
        isActive: true,
        viewCount: Math.floor(Math.random() * 80) + 10,
        applyCount: Math.floor(Math.random() * 20) + 2,
      });
      postIndex++;
    }
    console.log('Seeder: Referral posts created.');

    console.log('Seeder successfully completed execution!');
    process.exit(0);
  } catch (error) {
    console.error('Seeder: Error during seeding execution:', error);
    process.exit(1);
  }
}

seed();

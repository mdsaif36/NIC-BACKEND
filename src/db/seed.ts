import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js';
import { User } from '../models/User.js';
import { ReferralRequest } from '../models/ReferralRequest.js';
import { Message } from '../models/Message.js';

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
        responseSpeed: 'Within 1 day',
        successRate: '8 referred',
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

    console.log('Seeder successfully completed execution!');
    process.exit(0);
  } catch (error) {
    console.error('Seeder: Error during seeding execution:', error);
    process.exit(1);
  }
}

seed();

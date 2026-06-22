import { Router, Response } from 'express';
import { ReferralPost } from '../models/ReferralPost.js';
import { User } from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = Router();

// ─── GET all active referral posts (public feed for seekers) ───────────────
// ─── GET all active referral posts (public feed for seekers) ───────────────
const getAllActivePosts = async (req: AuthRequest, res: Response) => {
  try {
    const { search, company, domain, jobType, location } = req.query;

    const where: any = { isActive: true };

    if (company && company !== 'All') where.company = company;
    if (domain && domain !== 'All') where.domain = domain;
    if (jobType && jobType !== 'All') where.jobType = jobType;

    if (search) {
      where[Op.or] = [
        { role: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
      ];
    }

    const posts = await ReferralPost.findAll({
      where,
      include: [
        {
          model: User,
          as: 'alumni',
          attributes: ['id', 'name', 'college', 'company', 'jobTitle', 'availability'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Increment view counts (fire-and-forget)
    ReferralPost.increment('viewCount', { where, by: 1 }).catch(() => {});

    // Map to append flat attributes for compatibility
    const result = posts.map(post => {
      const json = post.toJSON() as any;
      if (json.alumni) {
        json.alumniName = json.alumni.name;
        json.alumniCompany = json.alumni.company;
      }
      return json;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching referral posts', error: error.message });
  }
};

router.get('/', authenticate as any, getAllActivePosts as any);
router.get('/all', authenticate as any, getAllActivePosts as any);

// ─── GET trending/stats for news ticker ───────────────────────────────────
router.get('/stats', authenticate as any, async (_req: AuthRequest, res: Response) => {
  try {
    const totalOpen = await ReferralPost.count({ where: { isActive: true } });

    // Top companies with most open posts
    const all = await ReferralPost.findAll({
      where: { isActive: true },
      attributes: ['company', 'role', 'domain'],
    });

    const companyCounts: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};
    all.forEach((p: any) => {
      companyCounts[p.company] = (companyCounts[p.company] || 0) + 1;
      domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1;
    });

    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));

    res.json({ totalOpen, topCompanies, topDomains });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// ─── POST — alumni creates a referral post ────────────────────────────────
const createActivePost = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'alumni') {
      return res.status(403).json({ message: 'Only alumni can post referrals.' });
    }

    const { company, role, location, jobType, domain, skills, description, deadline, slots } = req.body;

    if (!company || !role) {
      return res.status(400).json({ message: 'Company and role are required.' });
    }

    const post = await ReferralPost.create({
      alumniId: user.id,
      company: company || user.company || 'My Company',
      role,
      location: location || 'Remote',
      jobType: jobType || 'Full-time',
      domain: domain || 'Engineering',
      skills: skills || [],
      description: description || '',
      deadline: deadline || '',
      slots: slots || 1,
      isActive: true,
      viewCount: 0,
      applyCount: 0,
    });

    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating referral post', error: error.message });
  }
};

router.post('/', authenticate as any, createActivePost as any);
router.post('/create', authenticate as any, createActivePost as any);

// ─── PUT — alumni updates or closes their post ────────────────────────────
router.put('/:id', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const post = await ReferralPost.findByPk(req.params.id);

    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (post.alumniId !== user!.id) return res.status(403).json({ message: 'Unauthorized.' });

    await post.update(req.body);
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating post', error: error.message });
  }
});

// ─── DELETE — alumni deletes their post ──────────────────────────────────
router.delete('/:id', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const post = await ReferralPost.findByPk(req.params.id);

    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (post.alumniId !== user!.id) return res.status(403).json({ message: 'Unauthorized.' });

    await post.update({ isActive: false });
    res.json({ message: 'Post closed.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting post', error: error.message });
  }
});

// ─── POST — seeker marks interest / apply ────────────────────────────────
router.post('/:id/apply', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const post = await ReferralPost.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    await post.increment('applyCount');
    res.json({ message: 'Interest recorded.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error applying', error: error.message });
  }
});

// ─── GET alumni's own posts ───────────────────────────────────────────────
router.get('/my', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const posts = await ReferralPost.findAll({
      where: { alumniId: user!.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching your posts', error: error.message });
  }
});

export default router;

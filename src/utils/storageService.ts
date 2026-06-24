import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const storageService = {
  uploadResume: async (userId: string | number, filename: string, buffer: Buffer, mimetype: string): Promise<string> => {
    const filePath = `${userId}/${Date.now()}-${filename}`;
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(filePath, buffer, {
        contentType: mimetype,
        upsert: true
      });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);
    return publicUrl;
  },

  uploadScreenshot: async (userId: string | number, filename: string, buffer: Buffer, mimetype: string): Promise<string> => {
    const filePath = `${userId}/${Date.now()}-${filename}`;
    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(filePath, buffer, {
        contentType: mimetype,
        upsert: true
      });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('screenshots')
      .getPublicUrl(filePath);
    return publicUrl;
  },

  uploadReferralJD: async (alumniId: string | number, filename: string, buffer: Buffer, mimetype: string): Promise<string> => {
    const filePath = `${alumniId}/${Date.now()}-${filename}`;
    const { data, error } = await supabase.storage
      .from('referrals')
      .upload(filePath, buffer, {
        contentType: mimetype,
        upsert: true
      });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('referrals')
      .getPublicUrl(filePath);
    return publicUrl;
  },

  deleteResume: async (userId: string | number, filename: string): Promise<void> => {
    const filePath = filename.startsWith('http') 
      ? filename.split('/resumes/')[1] 
      : `${userId}/${filename}`;
    if (!filePath) return;
    await supabase.storage.from('resumes').remove([filePath]);
  },

  deleteScreenshot: async (userId: string | number, filename: string): Promise<void> => {
    const filePath = filename.startsWith('http')
      ? filename.split('/screenshots/')[1]
      : `${userId}/${filename}`;
    if (!filePath) return;
    await supabase.storage.from('screenshots').remove([filePath]);
  }
};

const { z } = require('zod');

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  rollNumber: z.string().min(2, 'Roll number is required').max(50).optional(),
  department: z.string().min(2, 'Department is required').max(100).optional(),
  year: z.coerce.number().int().min(1).max(5).optional(),
  profilePhoto: z.string().url('Profile photo must be a valid URL').or(z.literal('')).optional(),
});

module.exports = {
  updateProfileSchema,
};

const { z } = require('zod');

const platformUrlsSchema = z.object({
  leetcodeUrl: z.string().nullable().optional(),
  gfgUrl: z.string().nullable().optional(),
  codeforcesUrl: z.string().nullable().optional(),
  codechefUrl: z.string().nullable().optional(),
  hackerrankUrl: z.string().nullable().optional(),
  hackerRankUrl: z.string().nullable().optional(),
});

module.exports = {
  platformUrlsSchema,
};

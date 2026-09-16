const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(8).max(200)
});

const loginSchema = registerSchema;

const forgotSchema = z.object({
  email: z.string().min(3).max(254)
});

const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(200)
});

const createGameSchema = z.object({
  industry: z.enum(['software-house', 'ai-company', 'real-estate', 'furniture', 'bank', 'tourism']),
  difficulty: z.enum(['easy', 'normal', 'hard', 'expert']),
  companyName: z.string().min(2).max(60),
  founderName: z.string().min(2).max(60)
});

const previewSchema = z.object({
  industry: createGameSchema.shape.industry,
  difficulty: createGameSchema.shape.difficulty
});

const decisionSchema = z.object({
  eventId: z.string().min(1),
  decisionId: z.string().min(1),
  expectedStateVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid()
});

const actionSchema = z.object({
  type: z.enum([
    'hire',
    'fire',
    'promote',
    'make-manager',
    'assign-project',
    'assign-room',
    'train',
    'founder-focus',
    'rent-office',
    'buy-office',
    'renovate',
    'set-policy',
    'commission-intel',
    'pursue-suggestion'
  ]),
  payload: z.record(z.any()).optional(),
  expectedStateVersion: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid()
});

function parse(schema, payload) {
  return schema.parse(payload);
}

module.exports = {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  createGameSchema,
  previewSchema,
  decisionSchema,
  actionSchema,
  parse
};

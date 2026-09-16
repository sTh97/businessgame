const mongoose = require('mongoose');
const {
  games,
  gameStates,
  decisionHistory,
  projects,
  workforce,
  financialHistory,
  marketStates,
  userAchievements
} = require('../repositories');
const { AppError } = require('../utils/http');

async function persistNewGame({ game, state, workforceRows, market, session }) {
  const [created] = await games.create([game], { session });
  const gameId = created._id;
  await gameStates.create([{ ...state, gameId }], { session });
  if (workforceRows.length) {
    await workforce.insertMany(
      workforceRows.map((w) => ({ ...w, gameId })),
      { session }
    );
  }
  await marketStates.create([{ ...market, gameId }], { session });
  await games.updateOne({ _id: gameId }, { $set: { status: 'active' } }, { session });
  return created;
}

async function persistDecision({ gameId, expectedVersion, computed, userId, history, session }) {
  const updated = await gameStates.findOneAndUpdate(
    { gameId, version: expectedVersion },
    {
      $set: {
        version: computed.newGameState.version,
        level: computed.newGameState.level,
        gameMonth: computed.newGameState.gameMonth,
        state: computed.newGameState.state,
        industryState: computed.newGameState.industryState,
        pendingConsequences: computed.newGameState.pendingConsequences,
        currentEvent: computed.newGameState.currentEvent,
        score: computed.newGameState.score,
        lastOutcome: computed.newGameState.lastOutcome,
        updatedAt: new Date()
      }
    },
    { new: true, session }
  );
  if (!updated) {
    throw new AppError('STALE_STATE_VERSION', 'State changed — refetch and retry', 409);
  }

  await games.updateOne(
    { _id: gameId },
    {
      $set: {
        status: computed.gamePatch.status,
        currentLevel: computed.gamePatch.currentLevel,
        gameStateVersion: computed.gamePatch.gameStateVersion,
        score: computed.gamePatch.score,
        seenEventIds: computed.gamePatch.seenEventIds,
        criticalUsed: Boolean(computed.gamePatch.criticalUsed),
        updatedAt: new Date()
      }
    },
    { session }
  );

  try {
    await decisionHistory.create([history], { session });
  } catch (err) {
    if (err.code === 11000) {
      const existing = await decisionHistory.findOne({ idempotencyKey: history.idempotencyKey }).session(session);
      return { duplicate: true, existing };
    }
    throw err;
  }

  await financialHistory.updateOne(
    { gameId, period: computed.financials.period },
    { $set: { gameId, ...computed.financials } },
    { upsert: true, session }
  );

  await workforce.deleteMany({ gameId }, { session });
  if (computed.workforce?.length) {
    await workforce.insertMany(
      computed.workforce.map((w) => {
        const { _id, __v, ...rest } = w;
        return { ...rest, gameId };
      }),
      { session }
    );
  }

  const newProjects = computed.projects.filter((p) => p._new || !p._id);
  const existingProjects = computed.projects.filter((p) => p._id && !p._new);
  for (const p of existingProjects) {
    await projects.updateOne(
      { _id: p._id },
      {
        $set: {
          status: p.status,
          remaining: p.remaining,
          projectName: p.projectName
        }
      },
      { session }
    );
  }
  if (newProjects.length) {
    await projects.insertMany(
      newProjects.map((p) => {
        const copy = { ...p, gameId };
        delete copy._new;
        delete copy._id;
        return copy;
      }),
      { session }
    );
  }

  const { _id: _marketId, __v: _mv, gameId: _mg, ...marketFields } = computed.market || {};
  await marketStates.create(
    [
      {
        ...marketFields,
        gameId
      }
    ],
    { session }
  );

  if (computed.newAchievements?.length) {
    await userAchievements.insertMany(
      computed.newAchievements.map((a) => ({
        userId,
        gameId,
        achievementId: a._id
      })),
      { session, ordered: false }
    ).catch(() => {});
  }

  return { duplicate: false, updated };
}

async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { persistNewGame, persistDecision, withTransaction };

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('../utils/http');
const { formatDuration, secretsEqual } = require('../utils/presence');
const { users, games, loginHistory } = require('../repositories');

function signAdmin() {
  return jwt.sign({ sub: env.adminUsername, typ: 'admin' }, env.jwtAccessSecret, { expiresIn: '8h' });
}

async function login({ username, password }) {
  const userOk = secretsEqual(String(username || '').trim(), env.adminUsername);
  const passOk = secretsEqual(String(password || ''), env.adminPassword);
  if (!userOk || !passOk) {
    throw new AppError('UNAUTHORIZED', 'Invalid admin credentials', 401);
  }
  return { accessToken: signAdmin(), admin: { username: env.adminUsername } };
}

function me(admin) {
  return { username: admin?.username || env.adminUsername };
}

function publicLogin(row) {
  return {
    id: String(row._id),
    userId: String(row.userId),
    email: row.email,
    loggedInAt: row.loggedInAt,
    ip: row.ip || '',
    userAgent: row.userAgent || ''
  };
}

async function overview() {
  const [userDocs, gameDocs, loginDocs, totalLogins, usersLoggedIn] = await Promise.all([
    users
      .find({})
      .select('email createdAt lastLoginAt loginCount timeSpentMs lastSeenAt')
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .lean(),
    games
      .find({})
      .select('userId companyName industry difficulty status currentLevel createdAt updatedAt score')
      .sort({ updatedAt: -1 })
      .lean(),
    loginHistory.find({}).sort({ loggedInAt: -1 }).limit(200).lean(),
    loginHistory.countDocuments(),
    users.countDocuments({ lastLoginAt: { $ne: null } })
  ]);

  const gamesByUser = new Map();
  for (const g of gameDocs) {
    const id = String(g.userId);
    if (!gamesByUser.has(id)) gamesByUser.set(id, []);
    gamesByUser.get(id).push({
      gameId: String(g._id),
      companyName: g.companyName,
      industry: g.industry,
      difficulty: g.difficulty,
      status: g.status,
      currentLevel: g.currentLevel || 1,
      score: g.score || 0,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    });
  }

  const historyByUser = new Map();
  for (const row of loginDocs) {
    const id = String(row.userId);
    if (!historyByUser.has(id)) historyByUser.set(id, []);
    if (historyByUser.get(id).length < 12) historyByUser.get(id).push(publicLogin(row));
  }

  const userRows = userDocs.map((u) => {
    const list = gamesByUser.get(String(u._id)) || [];
    const active = list.filter((g) => g.status === 'active');
    const playingLevel = active.length
      ? Math.max(...active.map((g) => g.currentLevel || 1))
      : null;
    const highestLevel = list.length ? Math.max(...list.map((g) => g.currentLevel || 1)) : 0;
    const loginCount = Number(u.loginCount) || (u.lastLoginAt ? 1 : 0);
    const timeSpentMs = Number(u.timeSpentMs) || 0;
    return {
      userId: String(u._id),
      email: u.email,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt || null,
      lastSeenAt: u.lastSeenAt || null,
      loginCount,
      timeSpentMs,
      timeSpent: formatDuration(timeSpentMs),
      gamesInitiated: list.length,
      playingLevel,
      highestLevel,
      games: list,
      loginHistory: historyByUser.get(String(u._id)) || []
    };
  });

  const totalTimeSpentMs = userRows.reduce((sum, row) => sum + row.timeSpentMs, 0);
  const countedLogins = userRows.reduce((sum, row) => sum + row.loginCount, 0);

  return {
    totals: {
      registeredUsers: userDocs.length,
      usersLoggedIn,
      totalLogins: Math.max(totalLogins, countedLogins),
      totalTimeSpentMs,
      totalTimeSpent: formatDuration(totalTimeSpentMs),
      gamesInitiated: gameDocs.length
    },
    users: userRows,
    loginHistory: loginDocs.map(publicLogin)
  };
}

module.exports = { login, me, overview, signAdmin };

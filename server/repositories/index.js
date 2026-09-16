const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const PasswordReset = require('../models/PasswordReset');
const Game = require('../models/Game');
const GameState = require('../models/GameState');
const Industry = require('../models/Industry');
const Level = require('../models/Level');
const Event = require('../models/Event');
const Decision = require('../models/Decision');
const DecisionHistory = require('../models/DecisionHistory');
const Project = require('../models/Project');
const Workforce = require('../models/Workforce');
const FinancialHistory = require('../models/FinancialHistory');
const MarketState = require('../models/MarketState');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');

const Employee = require('../models/Employee');

module.exports = {
  users: User,
  refreshTokens: RefreshToken,
  passwordResets: PasswordReset,
  games: Game,
  gameStates: GameState,
  industries: Industry,
  levels: Level,
  events: Event,
  decisions: Decision,
  decisionHistory: DecisionHistory,
  projects: Project,
  workforce: Workforce,
  financialHistory: FinancialHistory,
  marketStates: MarketState,
  achievements: Achievement,
  userAchievements: UserAchievement,
  employees: Employee
};

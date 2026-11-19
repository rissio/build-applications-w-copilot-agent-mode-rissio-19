import { Activity, Team, User, Workout } from '../models/index.js';

class ServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ServiceError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[\da-f]{24}$/i.test(value);
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ServiceError(`O campo ${field} é obrigatório.`, 400);
  }
  return value.trim();
}

const activityTypes = new Set(['run', 'cycle', 'strength', 'walk']);
const activityFocus: Record<string, string> = {
  run: 'endurance',
  cycle: 'endurance',
  strength: 'strength',
  walk: 'endurance',
};
const activityLabels: Record<string, string> = {
  run: 'corridas',
  cycle: 'ciclismo',
  strength: 'atividades de força',
  walk: 'caminhadas',
};
const focusLabels: Record<string, string> = {
  endurance: 'resistência',
  strength: 'força',
  mobility: 'mobilidade',
};

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw new ServiceError('Os dados da atividade são inválidos.', 400);

  const { userId, teamId, type, minutes } = input;
  if (!isObjectId(userId) || !isObjectId(teamId)) {
    throw new ServiceError('Informe IDs válidos para a pessoa e a equipe.', 400);
  }
  if (typeof type !== 'string' || !activityTypes.has(type)) {
    throw new ServiceError('O tipo de atividade é inválido.', 400);
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw new ServiceError('A duração da atividade deve ser de pelo menos 1 minuto.', 400);
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id').lean(),
    Team.findById(teamId).select('_id').lean(),
  ]);
  if (!user || !team) {
    throw new ServiceError('A pessoa ou a equipe informada não foi encontrada.', 404);
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw new ServiceError('Os dados da equipe são inválidos.', 400);
  const name = requiredText(input.name, 'name');
  const mascot = requiredText(input.mascot, 'mascot');
  const members = input.members === undefined ? [] : input.members;
  if (!Array.isArray(members) || !members.every(isObjectId)) {
    throw new ServiceError('A lista de integrantes contém IDs inválidos.', 400);
  }

  const memberIds = [...new Set(members)];
  if (memberIds.length > 0) {
    const existingMembers = await User.find({ _id: { $in: memberIds } }).select('_id').lean();
    if (existingMembers.length !== memberIds.length) {
      throw new ServiceError('Um ou mais integrantes não foram encontrados.', 404);
    }
  }

  return Team.create({ name, mascot, members: memberIds });
}

export async function getLeaderboard() {
  const totals = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    { $unwind: { path: '$activities', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$_id',
        teamName: { $first: '$name' },
        totalPoints: { $sum: { $ifNull: ['$activities.points', 0] } },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
    { $project: { _id: 0, teamName: 1, totalPoints: 1 } },
  ]);
  return totals.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).select('_id fitnessGoal').lean();
  if (!user) throw new ServiceError('Pessoa não encontrada para este e-mail.', 404);

  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1, _id: -1 }).limit(5).select('type').lean(),
    Workout.find().lean(),
  ]);
  if (workouts.length === 0) return [];

  const recentFocus = recentActivities.map(({ type }) => activityFocus[type]).find(Boolean);
  const goal = user.fitnessGoal.trim().toLowerCase();
  const targetFocus = workouts.some(({ focus }) => focus.toLowerCase() === goal)
    ? goal
    : recentFocus && workouts.some(({ focus }) => focus.toLowerCase() === recentFocus)
      ? recentFocus
      : workouts[0].focus;

  return workouts
    .sort((left, right) => Number(right.focus.toLowerCase() === targetFocus) - Number(left.focus.toLowerCase() === targetFocus))
    .map((workout) => {
      const workoutFocus = workout.focus.toLowerCase();
      const recentType = recentActivities.find(({ type }) => activityFocus[type] === workoutFocus)?.type;
      const focusLabel = focusLabels[workoutFocus] ?? workout.focus;
      const reason = recentType
        ? `Recomendado para desenvolver ${focusLabel} com base nas suas ${activityLabels[recentType] ?? 'atividades'} recentes.`
        : workoutFocus === goal
          ? `Recomendado para apoiar sua meta de ${focusLabel}.`
          : `Sugestão de treino com foco em ${focusLabel}.`;
      return { ...workout, reason };
    });
}

export { User };

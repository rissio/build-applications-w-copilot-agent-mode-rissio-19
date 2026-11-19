import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createTeam } from '../src/services/octofitService.js';
import { Team, User } from '../src/models/index.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Team.deleteMany({}), User.deleteMany({})]);
});

describe('Associação de integrantes às equipes', () => {
  it('move a pessoa para a nova equipe e remove a associação anterior', async () => {
    const previousTeam = await Team.create({ name: 'Equipe anterior', mascot: 'Mona' });
    const member = await User.create({
      name: 'Mona',
      email: 'mona@example.com',
      team: previousTeam._id,
      fitnessGoal: 'endurance',
    });
    await Team.updateOne({ _id: previousTeam._id }, { $addToSet: { members: member._id } });

    const newTeam = await createTeam({
      name: 'Octocats',
      mascot: 'Mona',
      members: [member._id.toString()],
    });

    const updatedUser = await User.findById(member._id);
    const updatedPreviousTeam = await Team.findById(previousTeam._id);
    expect(updatedUser?.team?.toString()).toBe(newTeam._id.toString());
    expect(newTeam.members.map((id) => id.toString())).toContain(member._id.toString());
    expect(updatedPreviousTeam?.members.map((id) => id.toString())).not.toContain(member._id.toString());
  });
});

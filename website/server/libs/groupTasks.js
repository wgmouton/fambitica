import * as Tasks from '../models/task'; // eslint-disable-line import/no-cycle

async function handleSharedCompletion (teamTask) {
  if (teamTask.type === 'reward') return;
  const requireAll = teamTask.group?.completeByAll !== false;
  if (requireAll) {
    const incompleteTask = await Tasks.Task.findOne({
      'group.taskId': teamTask._id,
      userId: { $exists: true },
      completed: false,
    }, { _id: 1 }).exec();
    if (!incompleteTask) {
      teamTask.completed = true;
      teamTask.save();
    }
  } else {
    const completedTask = await Tasks.Task.findOne({
      'group.taskId': teamTask._id,
      userId: { $exists: true },
      completed: true,
    }, { _id: 1 }).exec();
    teamTask.completed = Boolean(completedTask);
    teamTask.save();
  }
}

export {
  handleSharedCompletion,
};

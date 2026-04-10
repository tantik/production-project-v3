import { listRows, upsertRow, updateRows } from '../services/db.js';

function toRow(task) {
  return {
    id: task.id,
    lead_id: task.leadId,
    status: task.status || 'pending',
    due_at: task.dueAt,
    created_at: task.createdAt || new Date().toISOString(),
    updated_at: task.updatedAt || new Date().toISOString(),
    data: task
  };
}

export async function upsertFollowup(task) {
  await upsertRow('followups', toRow(task));
  return task;
}

export async function listFollowups() {
  return listRows('followups', { orderBy: 'due_at ASC' });
}

export async function getDueFollowups(referenceIso = new Date().toISOString()) {
  return listRows('followups', {
    where: [
      { field: 'status', op: '=', value: 'pending' },
      { field: 'due_at', op: '<=', value: referenceIso }
    ],
    orderBy: 'due_at ASC'
  });
}

export async function cancelPendingFollowupsForLead(leadId, reason = 'cancelled') {
  const tasks = await listRows('followups', {
    where: [
      { field: 'lead_id', op: '=', value: leadId },
      { field: 'status', op: '=', value: 'pending' }
    ]
  });

  for (const task of tasks) {
    const updated = {
      ...task,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason,
      updatedAt: new Date().toISOString()
    };
    await upsertRow('followups', toRow(updated));
  }

  return listRows('followups', { where: [{ field: 'lead_id', op: '=', value: leadId }] });
}

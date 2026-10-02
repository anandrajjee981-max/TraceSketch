import { db } from "../config/db";

// Insert initial history record
export async function insertHistory(
  group_code: string,
  instance_id: string,
  entry_type: string
) {
  const query = `
    INSERT INTO group_history (group_code, instance_id, entry_type, saved_at)
    VALUES ($1, $2, $3, $4)
  `;
  const values = [group_code, instance_id, entry_type, Date.now()];

  await db.query(query, values);
  return { message: "History recorded successfully" };
}

// Append new data entry to group history
export async function insertData(
  group_code: string,
  instance_id: string,
  entry_type: string,
  trace_id: string,
  data: string
) {
  const query = `
    INSERT INTO group_history (group_code, instance_id, entry_type, trace_id, data, saved_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const values = [group_code, instance_id, entry_type, trace_id, data, Date.now()];

  await db.query(query, values);
  return { message: "Data appended to history successfully" };
}

// Drop history entries for a given group_code
export async function dropData(group_code: string) {
  const query = `DELETE FROM group_history WHERE group_code = $1`;
  const values = [group_code];

  await db.query(query, values);
  return { message: "Group history dropped successfully" };
}

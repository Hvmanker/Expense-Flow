import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('expenseflow.db');
  }
  return dbInstance;
}

export async function executeSql<T = Record<string, unknown>>(
  sql: string,
  args: SQLite.SQLiteBindParams = []
): Promise<T[]> {
  return getDatabase().getAllAsync<T>(sql, args);
}

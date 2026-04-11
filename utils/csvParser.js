const { parse } = require('csv-parse/sync');

const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const MAX_ROWS = 500;

/**
 * Parse a CSV buffer into an array of validated task objects.
 *
 * Expected CSV columns (header row required):
 *   title (required), description, status, priority, dueDate, assigneeId
 *
 * Returns { tasks: [], errors: [] }
 */
const parseTasksCSV = (buffer) => {
  const records = parse(buffer, {
    columns: true,           // use first row as header
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true // tolerate rows with fewer/more columns
  });

  if (records.length === 0) {
    return { tasks: [], errors: ['CSV file is empty or contains only headers'] };
  }

  if (records.length > MAX_ROWS) {
    return {
      tasks: [],
      errors: [`CSV contains ${records.length} rows which exceeds the maximum of ${MAX_ROWS}`]
    };
  }

  const tasks = [];
  const errors = [];

  records.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is the header

    const title = (row.title || '').trim();
    if (!title) {
      errors.push(`Row ${rowNum}: title is required`);
      return;
    }
    if (title.length > 255) {
      errors.push(`Row ${rowNum}: title must be 255 characters or fewer`);
      return;
    }

    const description = (row.description || '').trim() || null;

    const status = (row.status || '').trim().toLowerCase() || 'todo';
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`Row ${rowNum}: invalid status "${row.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
      return;
    }

    const priority = (row.priority || '').trim().toLowerCase() || 'medium';
    if (!VALID_PRIORITIES.includes(priority)) {
      errors.push(`Row ${rowNum}: invalid priority "${row.priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`);
      return;
    }

    let dueDate = null;
    const rawDate = (row.dueDate || '').trim();
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (isNaN(parsed.getTime())) {
        errors.push(`Row ${rowNum}: invalid dueDate "${row.dueDate}"`);
        return;
      }
      dueDate = parsed;
    }

    const assigneeId = (row.assigneeId || '').trim() || null;

    tasks.push({ title, description, status, priority, dueDate, assigneeId });
  });

  return { tasks, errors };
};

module.exports = { parseTasksCSV };

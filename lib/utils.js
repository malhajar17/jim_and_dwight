import fs from 'fs/promises';
import path from 'path';

/**
 * Get current timestamp in ISO format with Europe/Paris timezone
 * @returns {string} ISO timestamp
 */
export function getCurrentTimestamp() {
  return new Date().toLocaleString('sv-SE', { 
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(' ', 'T') + 'Z';
}

/**
 * Generate a run ID based on current date and time
 * @returns {string} run ID like "p_20250726_1012"
 */
export function generateRunId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `p_${year}${month}${day}_${hour}${minute}`;
}

/**
 * Ensure directory exists
 * @param {string} dirPath 
 */
export async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Read JSON file
 * @param {string} filePath 
 * @returns {Object|null}
 */
export async function readJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write JSON file
 * @param {string} filePath 
 * @param {Object} data 
 */
export async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Append to log file
 * @param {string} filePath 
 * @param {string} message 
 */
export async function appendLog(filePath, message) {
  const timestamp = getCurrentTimestamp();
  const logEntry = `[${timestamp}] ${message}\n`;
  await fs.appendFile(filePath, logEntry);
}

/**
 * Validate and trim answer
 * @param {string} answer 
 * @param {number} maxLength 
 * @returns {string}
 */
export function validateAnswer(answer, maxLength = 200) {
  if (!answer || typeof answer !== 'string') {
    throw new Error('Answer is required and must be a string');
  }
  
  const trimmed = answer.trim();
  if (trimmed.length === 0) {
    throw new Error('Answer cannot be empty');
  }
  
  if (trimmed.length > maxLength) {
    throw new Error(`Answer must be ${maxLength} characters or less`);
  }
  
  return trimmed;
} 
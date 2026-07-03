/** Recording quota limits — single source of truth for server + client. */

export const FREE_TRAINING_RECORDING_LIMIT = 3;
export const FREE_PITCH_RECORDER_LIMIT = 1;
export const PRO_TRAINING_RECORDING_LIMIT = 100;
export const PRO_PITCH_RECORDER_LIMIT = 20;

/** Maximum file size per recording upload (bytes). */
export const MAX_RECORDING_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Barrel del dominio "Students Workspace".
 * Superficie pública del motor de derivación (Wave 0). Sin efectos.
 */
export * from './types';
export { deriveGradStatus, deriveStage } from './stage';
export { deriveWorkItem, deriveWorkQueue, computeAgeDays } from './workQueue';
export {
    buildSnapshot, diffSnapshots, queueSignatureOf,
    type WorkspaceSnapshot, type SnapshotDiff, type StageDelta,
} from './snapshot';

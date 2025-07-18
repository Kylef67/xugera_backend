/**
 * Utility functions for consistent soft delete handling across the application
 */

/**
 * Standard filter to exclude soft-deleted documents
 */
export const NOT_DELETED_FILTER = { isDeleted: { $ne: true } };

/**
 * Add soft delete filter to an existing filter object
 * @param filter - Existing MongoDB filter object
 * @returns Filter object with soft delete filter added
 */
export function addSoftDeleteFilter(filter: any = {}): any {
  return { ...filter, ...NOT_DELETED_FILTER };
}

/**
 * Create soft delete update object
 * @returns Update object for soft deleting a document
 */
export function createSoftDeleteUpdate(): { isDeleted: boolean; deletedAt: Date } {
  return {
    isDeleted: true,
    deletedAt: new Date()
  };
}

/**
 * Create soft restore update object
 * @returns Update object for restoring a soft-deleted document
 */
export function createSoftRestoreUpdate(): { isDeleted: boolean; deletedAt?: undefined } {
  return {
    isDeleted: false,
    deletedAt: undefined
  };
}

/**
 * Helper function to perform soft delete on any model
 * @param Model - Mongoose model
 * @param id - Document ID to soft delete
 * @returns Promise resolving to the updated document or null if not found
 */
export async function performSoftDelete(Model: any, id: string) {
  return await Model.findOneAndUpdate(
    { _id: id, ...NOT_DELETED_FILTER },
    createSoftDeleteUpdate(),
    { new: true }
  );
}

/**
 * Helper function to restore a soft-deleted document
 * @param Model - Mongoose model
 * @param id - Document ID to restore
 * @returns Promise resolving to the updated document or null if not found
 */
export async function performSoftRestore(Model: any, id: string) {
  return await Model.findOneAndUpdate(
    { _id: id, isDeleted: true },
    createSoftRestoreUpdate(),
    { new: true }
  );
}

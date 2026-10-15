/* eslint-disable @typescript-eslint/naming-convention */
export const MgrsSpanName = {
  MANAGER_GET_TILE: 'mgrs.manager.get_tile',
} as const;

export type MgrsSpanName = (typeof MgrsSpanName)[keyof typeof MgrsSpanName];

export const MgrsAttributes = {
  TILE: 'geocoding.query.tile',
} as const;

export type MgrsAttributes = (typeof MgrsAttributes)[keyof typeof MgrsAttributes];

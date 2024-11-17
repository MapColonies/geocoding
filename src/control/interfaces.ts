/* eslint-disable @typescript-eslint/naming-convention */
import { GeoJsonProperties } from 'geojson';

export type BaseControlFeatureProperties = GeoJsonProperties & { regions?: { region: string; sub_region_names?: string[] }[] };

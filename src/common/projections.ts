export const wgs84Projection = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs';

export const utmProjection = (zone: number): string => `+proj=utm +zone=${zone} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;

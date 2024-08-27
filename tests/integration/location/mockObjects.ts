/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { QueryResult } from '../../../src/location/interfaces';
import { HierarchySearchHit } from '../../../src/location/models/elasticsearchHits';

type ChangeFields<T, R> = Omit<T, keyof R> & R;

export type MockLocationQueryFeature = ChangeFields<
  QueryResult['features'][number],
  {
    properties: Omit<QueryResult['features'][number]['properties'], 'rank'>;
  }
>;

export const NY_JFK_AIRPORT: MockLocationQueryFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-73.81278266814672, 40.66039916690434],
        [-73.8177430790069, 40.66160065836647],
        [-73.82178645734075, 40.66043068890016],
        [-73.82341214553732, 40.658185554886586],
        [-73.82407909454082, 40.65496001884071],
        [-73.8229536180974, 40.650532558586235],
        [-73.82211993184252, 40.647939195437345],
        [-73.81290769732489, 40.643985699842915],
        [-73.79214887014153, 40.63414837731818],
        [-73.78339516446982, 40.62987771430167],
        [-73.7898562329419, 40.62275933562921],
        [-73.78443726476769, 40.620069953803636],
        [-73.7791433570518, 40.627188619100366],
        [-73.77639219241223, 40.62706207167477],
        [-73.77159849644941, 40.62336045339214],
        [-73.77209870820208, 40.619975033140975],
        [-73.77047302000595, 40.61908910045176],
        [-73.76547094984971, 40.628422477310664],
        [-73.75338249916041, 40.63291467256053],
        [-73.74733827381596, 40.63601474373485],
        [-73.7467963777506, 40.64208793530722],
        [-73.752548854642, 40.64749646458006],
        [-73.76213624656812, 40.65309424493557],
        [-73.78181122379466, 40.66270746643491],
        [-73.79106514121902, 40.66438330508498],
        [-73.7957754685564, 40.665205399216404],
        [-73.79856831750864, 40.66283394629252],
        [-73.80390390953731, 40.66175885985783],
        [-73.8073637074931, 40.66039916690434],
        [-73.8109068740743, 40.66074699797244],
        [-73.81278266814672, 40.66039916690434],
      ],
    ],
  },
  properties: {
    matches: [{ source: 'OSM', layer: 'osm_airports', source_id: ['03ed6d97-fc81-4340-b68a-11993554eef1'] }],
    name: {
      en: ['JFK Airport'],
      fr: ['Aeropuerto JFK'],
      default: ['JFK'],
      display: 'JFK Airport',
    },
    placetype: 'transportation',
    sub_placetype: 'airport',
    regions: [
      {
        region: 'USA',
        sub_region_names: ['New York'],
      },
    ],
  },
};

export const NY_POLICE_AIRPORT: MockLocationQueryFeature = {
  type: 'Feature',
  geometry: {
    coordinates: [
      [
        [-73.50019138870562, 40.76503398530525],
        [-73.49991804403106, 40.75762191351754],
        [-73.50172211928987, 40.75368779651572],
        [-73.502924836068, 40.74958778448408],
        [-73.50095675396722, 40.746067370663354],
        [-73.49587254187276, 40.74117989901089],
        [-73.48810955136324, 40.74010295019133],
        [-73.4862508071566, 40.74097279482331],
        [-73.48450140084462, 40.74209114977816],
        [-73.48335335295225, 40.743250905424986],
        [-73.49368578398266, 40.7500847690697],
        [-73.49363111503533, 40.75112014169309],
        [-73.49166303293454, 40.75087165373341],
        [-73.49128035030373, 40.75435040065955],
        [-73.48406404926651, 40.75385344795657],
        [-73.4860321313673, 40.75840870869581],
        [-73.50019138870562, 40.76503398530525],
      ],
    ],
    type: 'Polygon',
  },
  properties: {
    matches: [{ source: 'OSM', layer: 'osm_airports', source_id: ['009c6b65-3dcb-4c4f-9f02-d766ebb5d808'] }],
    name: {
      en: ['Nassau County Police Airport'],
      fr: ['Aeropuerto de la Policía del Condado de Nassau'],
      default: ['Nassau County Police Airport'],
      display: 'Nassau County Police Airport',
    },
    placetype: 'transportation',
    sub_placetype: 'airport',
    regions: [
      {
        region: 'USA',
        sub_region_names: ['New York'],
      },
    ],
  },
};

export const LA_AIRPORT: MockLocationQueryFeature = {
  type: 'Feature',
  geometry: {
    coordinates: [
      [
        [-118.42713070992883, 33.9512236894319],
        [-118.43440343023548, 33.94992163234602],
        [-118.43571147345608, 33.94670980636225],
        [-118.43560682999878, 33.943107208682775],
        [-118.43325235220159, 33.938723119106925],
        [-118.42875268352236, 33.9310829780122],
        [-118.41394563426408, 33.931820976094315],
        [-118.39756893251248, 33.932255089782316],
        [-118.38516868278077, 33.935250412835686],
        [-118.37904703905322, 33.936509285268926],
        [-118.37899471732432, 33.943367642688045],
        [-118.3788377519829, 33.94501703885841],
        [-118.39181354073204, 33.94527746687625],
        [-118.39510980964849, 33.945451085112225],
        [-118.3980398264626, 33.94558129855595],
        [-118.39746428744567, 33.949748023597365],
        [-118.39720267894361, 33.953003135913036],
        [-118.40813791735772, 33.95252573110099],
        [-118.42713070992883, 33.9512236894319],
      ],
    ],
    type: 'Polygon',
  },
  properties: {
    matches: [{ source: 'OSM', layer: 'osm_airports', source_id: ['a4f373ab-b824-41e2-b160-e7729c73bea6'] }],
    name: {
      en: ['Los Angeles International Airport'],
      fr: ['Aeropuerto Internacional de Los Ángeles'],
      default: ['Los Angeles International Airport'],
      display: 'Los Angeles International Airport',
    },
    placetype: 'transportation',
    sub_placetype: 'airport',
    regions: [
      {
        region: 'USA',
        sub_region_names: ['Los Angeles'],
      },
    ],
  },
};

export const OSM_LA_PORT: MockLocationQueryFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-118.2505781304088, 33.7502674389752],
        [-118.25604403409116, 33.76075151051916],
        [-118.27057180697577, 33.748593059782564],
        [-118.27503083555426, 33.741097783576635],
        [-118.2747911028351, 33.734798055529765],
        [-118.27215404292296, 33.73136889520775],
        [-118.26807858669537, 33.720881194108856],
        [-118.26424286318695, 33.721997816398385],
        [-118.26640045650717, 33.72901625632974],
        [-118.2431463824787, 33.735794882347946],
        [-118.24492040460113, 33.739303607948656],
        [-118.25072193640723, 33.73794798097781],
        [-118.25220827926702, 33.74193505797223],
        [-118.24937943317966, 33.74508471776615],
        [-118.24798898340768, 33.74783559181691],
        [-118.24909175391655, 33.74803492708783],
        [-118.25096166912684, 33.74600168558719],
        [-118.25326310323155, 33.745363795966625],
        [-118.25278363779321, 33.74687877606813],
        [-118.2505781304088, 33.7502674389752],
      ],
    ],
  },
  properties: {
    matches: [{ source: 'OSM', layer: 'osm_ports', source_id: ['0f36d985-cfbd-4aed-b0cb-ee56600c77f4'] }],
    name: {
      en: ['Port of Los Angeles'],
      fr: ['Puerto de Los Ángeles'],
      default: ['Port of Los Angeles'],
      display: 'Port of Los Angeles',
    },
    placetype: 'transportation',
    sub_placetype: 'port',
    regions: [
      {
        region: 'USA',
        sub_region_names: ['Los Angeles'],
      },
    ],
  },
};
export const GOOGLE_LA_PORT: MockLocationQueryFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-118.2505781304088, 33.7502674389752],
        [-118.25604403409116, 33.76075151051916],
        [-118.27057180697577, 33.748593059782564],
        [-118.27503083555426, 33.741097783576635],
        [-118.2747911028351, 33.734798055529765],
        [-118.27215404292296, 33.73136889520775],
        [-118.26807858669537, 33.720881194108856],
        [-118.26424286318695, 33.721997816398385],
        [-118.26640045650717, 33.72901625632974],
        [-118.2431463824787, 33.735794882347946],
        [-118.24492040460113, 33.739303607948656],
        [-118.25072193640723, 33.73794798097781],
        [-118.25220827926702, 33.74193505797223],
        [-118.24937943317966, 33.74508471776615],
        [-118.24798898340768, 33.74783559181691],
        [-118.24909175391655, 33.74803492708783],
        [-118.25096166912684, 33.74600168558719],
        [-118.25326310323155, 33.745363795966625],
        [-118.25278363779321, 33.74687877606813],
        [-118.2505781304088, 33.7502674389752],
      ],
    ],
  },
  properties: {
    matches: [{ source: 'GOOGLE', layer: 'google_ports', source_id: ['1bb11f54-939e-457b-bf68-a3920ccf629c'] }],
    name: {
      en: ['Port of Los Angeles'],
      fr: ['Puerto de Los Ángeles'],
      default: ['Port of Los Angeles'],
      display: 'Port of Los Angeles',
    },
    placetype: 'transportation',
    sub_placetype: 'port',
    regions: [
      {
        region: 'USA',
        sub_region_names: ['Los Angeles'],
      },
    ],
  },
};

export const LA_WHITE_POINT_SCHOOL: MockLocationQueryFeature = {
  type: 'Feature',
  geometry: {
    coordinates: [
      [
        [-118.30812263653988, 33.71684417247593],
        [-118.30861990876181, 33.71674433152869],
        [-118.30879709771484, 33.71635922964194],
        [-118.30619642115158, 33.71550819588987],
        [-118.30586490633668, 33.715921827872904],
        [-118.30587062210924, 33.716183318328746],
        [-118.30812263653988, 33.71684417247593],
      ],
    ],
    type: 'Polygon',
  },
  properties: {
    matches: [
      {
        source: 'OSM',
        layer: 'osm_schools',
        source_id: ['1a5b981b-bb0e-44dd-b9e2-424b92f2de49'],
      },
    ],
    name: {
      en: ['White Point Elementary School'],
      fr: ['Escuela Primaria White Point'],
      default: ['White Point Elementary School'],
      display: 'White Point Elementary School',
    },
    placetype: 'education',
    sub_placetype: 'school',
    regions: [
      {
        region: 'USA',
        sub_region_names: ['Los Angeles'],
      },
    ],
  },
};

export const PARIS_WI_SCHOOL: MockLocationQueryFeature = {
  type: 'Feature',
  geometry: {
    coordinates: [
      [
        [2.346441270696971, 48.88088750665477],
        [2.3462780852304945, 48.88018258877358],
        [2.347503576087604, 48.87999951892243],
        [2.347737155284733, 48.88070864783427],
        [2.346441270696971, 48.88088750665477],
      ],
    ],
    type: 'Polygon',
  },
  properties: {
    source: 'OSM',
    layer: 'osm_schools',
    source_id: ['dc02a3f9-156a-4f61-85bd-fd040cd322a3'],
    name: {
      en: ['Wi School Paris 9'],
      fr: ['Ecole Wi Paris 9'],
      default: ['Wi School Paris 9'],
      display: 'Wi School Paris 9',
    },
    placetype: 'education',
    sub_placetype: 'school',
    regions: [
      {
        region: 'FRANCE',
        sub_regions: ['Paris'],
      },
    ],
  },
};

export const NY_HIERRARCHY: HierarchySearchHit = {
  geo_json: {
    coordinates: [
      [
        [-73.74286189030825, 40.566325396473786],
        [-73.47084009765854, 40.56212896709357],
        [-73.550927745189, 41.11163279131463],
        [-73.74424271181776, 41.225972287315074],
        [-73.99969469100891, 41.26438691280978],
        [-74.24962338416366, 41.05959508414017],
        [-74.13087273437748, 40.7506852054762],
        [-74.00659879855483, 40.530651727069795],
        [-73.74286189030825, 40.566325396473786],
      ],
    ],
    type: 'Polygon',
  },
  hierarchy: 'city',
  placetype: 'city',
  region: 'USA',
  text: 'New York',
  weight: 1.1,
};

export const LA_HIERRARCHY: HierarchySearchHit = {
  geo_json: {
    coordinates: [
      [
        [-118.54430957638033, 34.07939240620722],
        [-118.5350828996408, 33.695192367610986],
        [-118.04596133238863, 33.47690745532634],
        [-117.66265886139905, 33.379872950239346],
        [-117.57145361502153, 33.63336904289318],
        [-117.67279277766329, 34.23871934668085],
        [-118.2605599209839, 34.28059749364003],
        [-118.54430957638033, 34.07939240620722],
      ],
    ],
    type: 'Polygon',
  },
  hierarchy: 'city',
  placetype: 'city',
  region: 'USA',
  text: 'Los Angeles',
  weight: 1.1,
};

export const PARIS_HIERRARCHY: HierarchySearchHit = {
  geo_json: {
    coordinates: [
      [
        [2.226678539753607, 49.06838747927134],
        [1.9344166918067742, 48.906487548202136],
        [2.014124468519668, 48.56855190252173],
        [2.6536844864307625, 48.53463335095324],
        [2.902296837606201, 48.82159183126478],
        [2.6460932696008683, 49.0124047223114],
        [2.384196288972504, 49.05097737411208],
        [2.226678539753607, 49.06838747927134],
      ],
    ],
    type: 'Polygon',
  },
  hierarchy: 'city',
  placetype: 'city',
  region: 'FRANCE',
  text: 'Paris',
  weight: 1.1,
};
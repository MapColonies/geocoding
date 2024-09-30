/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';
import { FeatureCollection } from 'geojson';

/* ------------------- Objects for testing common/utils.ts: formatResponse() - ITEM type  -------------------*/
export const itemElasticResponse: Pick<estypes.SearchResponse, 'hits'> = {
  hits: {
    total: { value: 1, relation: 'eq' },
    max_score: 1.89712,
    hits: [
      {
        _index: 'control_gil_v5',
        _id: 'CONTROL.ITEMS',
        _score: 1.89712,
        _source: {
          type: 'Feature',
          geometry: {
            coordinates: [
              [
                [98.96871358832425, 18.77187541003238],
                [98.96711613001014, 18.772012912146167],
                [98.9668257091372, 18.77957500633211],
                [98.96517988589727, 18.783516234000658],
                [98.96305002071, 18.786174113473763],
                [98.96222710028087, 18.786036643850125],
                [98.9615009529004, 18.784478609414165],
                [98.96096850521184, 18.78324114944766],
                [98.96058105300438, 18.74932410944021],
                [98.96029062202649, 18.747169677704846],
                [98.9619364723165, 18.74666541646775],
                [98.96479250629358, 18.7514784826093],
                [98.96401797557468, 18.75193687161918],
                [98.96614791571238, 18.754412116891245],
                [98.96639000300826, 18.75940841151673],
                [98.96779381973744, 18.759133392649602],
                [98.96798745662056, 18.76018763174328],
                [98.96789063809456, 18.761746062357858],
                [98.96905242991687, 18.763487833908357],
                [98.96871358832425, 18.77187541003238],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            OBJECT_COMMAND_NAME: '4805',
            TILE_NAME: 'DEF',
            SUB_TILE_ID: '36',
            ENTITY_HEB: 'airport',
            TYPE: 'ITEM',
          },
        },
      },
    ],
  },
};

export const itemExpectedFormattedResponse: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        coordinates: [
          [
            [98.96871358832425, 18.77187541003238],
            [98.96711613001014, 18.772012912146167],
            [98.9668257091372, 18.77957500633211],
            [98.96517988589727, 18.783516234000658],
            [98.96305002071, 18.786174113473763],
            [98.96222710028087, 18.786036643850125],
            [98.9615009529004, 18.784478609414165],
            [98.96096850521184, 18.78324114944766],
            [98.96058105300438, 18.74932410944021],
            [98.96029062202649, 18.747169677704846],
            [98.9619364723165, 18.74666541646775],
            [98.96479250629358, 18.7514784826093],
            [98.96401797557468, 18.75193687161918],
            [98.96614791571238, 18.754412116891245],
            [98.96639000300826, 18.75940841151673],
            [98.96779381973744, 18.759133392649602],
            [98.96798745662056, 18.76018763174328],
            [98.96789063809456, 18.761746062357858],
            [98.96905242991687, 18.763487833908357],
            [98.96871358832425, 18.77187541003238],
          ],
        ],
        type: 'Polygon',
      },
      properties: {
        OBJECT_COMMAND_NAME: '4805',
        TILE_NAME: 'DEF',
        SUB_TILE_ID: '36',
        ENTITY_HEB: 'airport',
        TYPE: 'ITEM',
      },
    },
  ],
};

/* ------------------- Objects for testing common/utils.ts: formatResponse() - TILE type  -------------------*/

export const tileElasticResponse: Pick<estypes.SearchResponse, 'hits'> = {
  hits: {
    total: { value: 1, relation: 'eq' },
    max_score: 2.184802,
    hits: [
      {
        _index: 'control_gil_v5',
        _id: 'CONTROL.TILES',
        _score: 2.184802,
        _source: {
          type: 'Feature',
          geometry: {
            coordinates: [
              [
                [12.539507865186607, 41.851751203650096],
                [12.536787075186538, 41.94185043165008],
                [12.42879133518656, 41.93952837265009],
                [12.431625055186686, 41.84943698365008],
                [12.539507865186607, 41.851751203650096],
              ],
            ],
            type: 'Polygon',
          },
          properties: { TILE_NAME: 'RIT', TYPE: 'TILE' },
        },
      },
    ],
  },
};

export const tileExpectedFormattedResponse: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        coordinates: [
          [
            [12.539507865186607, 41.851751203650096],
            [12.536787075186538, 41.94185043165008],
            [12.42879133518656, 41.93952837265009],
            [12.431625055186686, 41.84943698365008],
            [12.539507865186607, 41.851751203650096],
          ],
        ],
        type: 'Polygon',
      },
      properties: { TILE_NAME: 'RIT', TYPE: 'TILE' },
    },
  ],
};

/* ------------------- Objects for testing common/utils.ts: formatResponse() - SUB_TILE type  -------------------*/

export const subTileElasticResponse: Pick<estypes.SearchResponse, 'hits'> = {
  hits: {
    total: { value: 1, relation: 'eq' },
    max_score: 2.877949,
    hits: [
      {
        _index: 'control_gil_v5',
        _id: 'CONTROL.SUB_TILES',
        _score: 2.877949,
        _source: {
          type: 'Feature',
          geometry: {
            coordinates: [
              [
                [27.149158174343427, 35.63159611670335],
                [27.149274355343437, 35.64061707270338],
                [27.138786228343463, 35.640716597703374],
                [27.13867103934342, 35.631695606703374],
                [27.149158174343427, 35.63159611670335],
              ],
            ],
            type: 'Polygon',
          },
          properties: { SUB_TILE_ID: '65', TILE_NAME: 'GRC', TYPE: 'SUB_TILE' },
        },
      },
    ],
  },
};
export const subTileExpectedFormattedResponse: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        coordinates: [
          [
            [27.149158174343427, 35.63159611670335],
            [27.149274355343437, 35.64061707270338],
            [27.138786228343463, 35.640716597703374],
            [27.13867103934342, 35.631695606703374],
            [27.149158174343427, 35.63159611670335],
          ],
        ],
        type: 'Polygon',
      },
      properties: { SUB_TILE_ID: '65', TILE_NAME: 'GRC', TYPE: 'SUB_TILE' },
    },
  ],
};

/* ------------------- Objects for testing common/utils.ts: formatResponse() - ROUTE type  -------------------*/

export const routeElasticResponse: Pick<estypes.SearchResponse, 'hits'> = {
  hits: {
    total: { value: 1, relation: 'eq' },
    max_score: 1.89712,
    hits: [
      {
        _index: 'control_gil_v5',
        _id: 'CONTROL.ROUTES',
        _score: 1.89712,
        _source: {
          type: 'Feature',
          geometry: {
            coordinates: [
              [13.448493352142947, 52.31016611400918],
              [13.447219581381603, 52.313370282889224],
              [13.448088381125075, 52.31631514453963],
              [13.450458681234068, 52.31867376333767],
              [13.451112278530388, 52.32227665244022],
              [13.449728938644029, 52.32463678850752],
              [13.445021899434977, 52.32863442881066],
              [13.444723882330948, 52.340023400115086],
              [13.446229682887974, 52.34532799609971],
            ],
            type: 'LineString',
          },
          properties: {
            OBJECT_COMMAND_NAME: 'route96',
            ENTITY_HEB: 'route96',
            TYPE: 'ROUTE',
          },
        },
      },
    ],
  },
};
export const routeExpectedFormattedResponse: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        coordinates: [
          [13.448493352142947, 52.31016611400918],
          [13.447219581381603, 52.313370282889224],
          [13.448088381125075, 52.31631514453963],
          [13.450458681234068, 52.31867376333767],
          [13.451112278530388, 52.32227665244022],
          [13.449728938644029, 52.32463678850752],
          [13.445021899434977, 52.32863442881066],
          [13.444723882330948, 52.340023400115086],
          [13.446229682887974, 52.34532799609971],
        ],
        type: 'LineString',
      },
      properties: {
        OBJECT_COMMAND_NAME: 'route96',
        ENTITY_HEB: 'route96',
        TYPE: 'ROUTE',
      },
    },
  ],
};

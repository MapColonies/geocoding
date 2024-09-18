# Geocoding
MapColonies have a custom Control Grid. Thus, this service provides a way to search for them. Also, you can search for locations from various location sources. Served by Vector Team. 
Architecture:
<img width="3543" alt="Vector Geocoding (3)" src="https://github.com/user-attachments/assets/1324007a-f61c-4109-8340-c0042913d73c">

The API exposes 5 major routes.
1. `/search/query`
2. `/search/location`
3. `/search/control`
4. `/lookup/coordinates`
5. `/search/MGRS/tiles`

Each route provides a different purpose.
`/search/query` enables users to search anything. Based on a set of Regular Expressions, it will "navigate"/ proxy the request to the right route.
`/search//location` enables users to search locations via text-based search and filter them by source, region, geo context, and more. This route also enables users to get available sources and regions and you can filter on as they might change in the future. 
`/search/control` enables users to search on MapColonies Control Grid. Users can search for Tiles, Items and Routes. 
`/lookup/coordinates` enables users to convert WGS84 coordinates and decide whether the response will be in MapColonies Control Tile our US Army MGRS Tile. 
`/search/MGRS/tiles` enables users to convert a US Army MGRS Tile to a GeoJSON Feature.

Almost all routes have common request query parameters. They provide a way to filter/ manipulate the response to be more accurate/relevant to the end user.
1. `geo_context`: Geo Context of the search. It accepts bbox, WGS84 coordinates, UTM coordinates.
2. `geo_context_mode`: Choose whether the geo_context query parameter will be a `filter` or `bias` value. Filter, of course, will filter the results to results that intersect with `geo_context`. Bias will cause results that intersect with `geo_context` to appear first in the response.
3. `disable_fuzziness`: Fuzziness is true by default to enable users to get a search engine-like feeling with suggested results that might match their search.
4. `limit`: Maximum number of returned results. The response might be with less than the requested limit if no matches are found, but maximum features will be returned according to the `limit`'s value.

> [!IMPORTANT]
> We also have Feedback API. Each request is sent back with x-req-id which is the identifier of the request. We kindly ask our users to provide us with a request to Feedback API which contains x-api-key and clicked response. It enables us to research the request and response to be more accurate.
> Feedback API source code is built in a different repository at <TODO: ADD LINK TO FEEDBACK API REPO>.
> Geocoding API inserts the request and response to Redis before the response is sent.

## API
Checkout the OpenAPI spec [here](/openapi3.yaml)

## Installation
Setup Elasticsearch and S3 provider (For local environment, Minio as a personal recommendation).
Containered Elasticsearch:
```
docker run -d -t elasticsearch -e "discovery.type=single-node" -e "xpack.security.enabled=false" -e "xpack.security.enrollment.enabled=false" -e "ELASTIC_CONTAINER=true" elasticsearch:8.13.0
```
(optinal) Containered Kibana:
```
docker run -d -t kibana -e "ELASTIC_CONTAINER=true" kibana:8.13.0
```
Containered Minio:
```
docker run -p 9000:9000 -d -p 9001:9001 -e "MINIO_ROOT_USER=minio" -e "MINIO_ROOT_PASSWORD=minio123" quay.io/minio/minio server /data --console-address ":9001"
```
> [!NOTE]
> Right to date (September 18th 2024), Elasticsearch's default username is `elastic` and password is `changeme`.

Install mock data - Don't forget to edit /config/test.json file to your specific specific config.
```bash
npm run dev:scripts
```

Install deps with npm

```bash
npm install
```
### Install Git Hooks
```bash
npx husky install
```

## Run Locally

Clone the project

```bash

git clone https://github.com/MapColonies/geocoding.git

```

Go to the project directory

```bash

cd geocoding

```

Install dependencies

```bash

npm install

```

Start the server

```bash

npm run start

```

## Running Tests

To run tests, run the following command

```bash

npm run test

```

To only run unit tests:
```bash
npm run test:unit
```

To only run integration tests:
```bash
npm run test:integration
```

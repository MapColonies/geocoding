# Geocoding

## TL;DR

Search for places, control tiles, routes and items. Ability to convert from WGS 84 Coordinates to Control Tile/ US Army MGRS. 

> [!TIP]
> Checkout the OpenAPI spec [here](/openapi3.yaml) and the documentation [here](https://mapcolonies.github.io/developer-portal/docs/MapColonies/vector/Services/geocoding/info)

## Terminology

### What is the Control layer?

MapColonies has its own Control Reference System. Like the US Army MGRS, we divided our user's area of interest to Tiles. Each tile is 10kmX10km and has Sub-Tiles which are 1kmX1km. Each tile has 100 sub-tiles. <br/>
A tile's name is exactly 3-letters, while a Sub-Tile is a 2-digit number. <br/>

## Architecture:
<img width="3543" alt="Vector Geocoding (3)" src="https://github.com/user-attachments/assets/1324007a-f61c-4109-8340-c0042913d73c">

The API exposes 5 major routes.
1. `/search/query`
2. `/search/location`
3. `/search/control`
4. `/lookup/coordinates`
5. `/search/MGRS/tiles`

Each route provides a different purpose. <br/>
`/search/query` enables users to search anything. Based on a set of Regular Expressions, it will "navigate"/ proxy the request to the right route. <br/>
`/search//location` enables users to search locations via text-based search and filter them by source, region, geo context, and more. This route also enables users to get available sources and regions and you can filter on as they might change in the future. <br/>
`/search/control` enables users to search on MapColonies Control Grid. Users can search for Tiles, Items and Routes. <br/>
`/lookup/coordinates` enables users to convert WGS84 coordinates and decide whether the response will be in MapColonies Control Tile our US Army MGRS Tile. <br/>
`/search/MGRS/tiles` enables users to convert a US Army MGRS Tile to a GeoJSON Feature.<br/>

Almost all of our routes consists of the same common query parameters: `geo_context`, `geo_context_mode`, `limit` and `disable_fuzziness`. <br/>

| Query Parameter | Type | Default Value | Usage Explanation |
| --- | --- | --- | --- |
| geo_context | Bounding Box, WGS84 Circle, UTM Circle | `undefined` | Via this param you can provide the search engine for geo context of the search. |
| geo_context_mode | Enum(`filter`,`bias`)  | `undefined` | Via this param you tell the search engine what to do with `geo_context`. You can filter results (which will result with every feature that matches the query and intersects with `geo_context` shape) or you can bias the results. So features that intersect with the `geo_context` will appear first. |
| limit | Number | 5 | By default, we will return our top 5 features that match the query. You can change the limit and set it from 1 to 15 maximum results. If there are few results, the response may contain less than limit, but the importance is limiting the maximum returned values. |
| disable_fuzziness | Boolean  | false | Fuzziness is on by default. If you want exact match, you may set `disable_fuzziness: true`. |
> [!IMPORTANT]
> We also have Feedback API. Each request is sent back with x-req-id which is the identifier of the request. We kindly ask our users to provide us with a request to Feedback API which contains x-api-key and clicked response. It enables us to research the request and response to be more accurate.
> Feedback API source code is built in a different repository at <TODO: ADD LINK TO FEEDBACK API REPO>.
> Geocoding API inserts the request and response to Redis before the response is sent.

## Installation
Setup Elasticsearch and S3 provider (For local environment, Minio as a personal recommendation).
Containered Elasticsearch:
```
docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" -e "xpack.security.enrollment.enabled=false" -e "ELASTIC_CONTAINER=true" elasticsearch:8.13.0
```
(optinal) Containered Kibana:
```
docker run -d --name kibana -p 5601:5601 -e "ELASTIC_CONTAINER=true" kibana:8.13.0
```
Containered Minio:
```
docker run -d --name minio -p 9000:9000 -p 9001:9001 -e "MINIO_ROOT_USER=minio" -e "MINIO_ROOT_PASSWORD=minio123" quay.io/minio/minio server /data --console-address ":9001"
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

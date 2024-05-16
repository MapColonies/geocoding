# Geocoding
This is an API for MapColonies custom geocoding service. 
## API
Checkout the OpenAPI spec [here](/openapi3.yaml)

## Installation
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

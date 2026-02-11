# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.2.1](https://github.com/MapColonies/geocoding/compare/v2.2.0...v2.2.1) (2026-02-11)


### Bug Fixes

* await redis connection before register cleanup ([#91](https://github.com/MapColonies/geocoding/issues/91)) ([531610a](https://github.com/MapColonies/geocoding/commit/531610aef4d376a15b68dd0a5724bfa142bd9f7a))

## [2.2.0](https://github.com/MapColonies/geocoding/compare/v2.1.0...v2.2.0) (2026-01-05)


### Features

* updated schema ([#89](https://github.com/MapColonies/geocoding/issues/89)) ([3f2f388](https://github.com/MapColonies/geocoding/commit/3f2f3883211c30e0acf92014eaf2e827ec95407a))

## [2.1.0](https://github.com/MapColonies/geocoding/compare/v2.0.0...v2.1.0) (2025-12-25)


### Features

* added prefix option to redis ([#88](https://github.com/MapColonies/geocoding/issues/88)) ([0ca7111](https://github.com/MapColonies/geocoding/commit/0ca7111f5c4c4ea03e146a1cf827abcc4a90d182))


### Bug Fixes

* changed sub_tile regex ([#76](https://github.com/MapColonies/geocoding/issues/76)) ([8a066ee](https://github.com/MapColonies/geocoding/commit/8a066eeb3b2160821d807ca6e1257945c1a07d07))

## [2.0.0](https://github.com/MapColonies/geocoding/compare/v1.1.1...v2.0.0) (2025-09-01)


### ⚠ BREAKING CHANGES

* update to boilerplate mapco 6313 ([#78](https://github.com/MapColonies/geocoding/issues/78))

### Features

* add redis ttl ([#77](https://github.com/MapColonies/geocoding/issues/77)) ([496b8d2](https://github.com/MapColonies/geocoding/commit/496b8d23c68eaf1e529c5b407242b9d2826e9834))


### Bug Fixes

* removed mocked config from default config ([#75](https://github.com/MapColonies/geocoding/issues/75)) ([ce35865](https://github.com/MapColonies/geocoding/commit/ce3586596817142a30cc5ea938522db5b21d3f76))


### Code Refactoring

* update to boilerplate mapco 6313 ([#78](https://github.com/MapColonies/geocoding/issues/78)) ([82ea5d7](https://github.com/MapColonies/geocoding/commit/82ea5d776844166f1daa9d41ad583f5659ab1e35))

### [1.1.2](https://github.com/MapColonies/geocoding/compare/v1.1.1...v1.1.2) (2025-05-12)


### Bug Fixes

* removed mocked config from default config ([#75](https://github.com/MapColonies/geocoding/issues/75)) ([ce35865](https://github.com/MapColonies/geocoding/commit/ce3586596817142a30cc5ea938522db5b21d3f76))

### [1.1.1](https://github.com/MapColonies/geocoding/compare/v1.1.0...v1.1.1) (2025-02-12)


### Bug Fixes

* fix build and push docker workflow ([#74](https://github.com/MapColonies/geocoding/issues/74)) ([a38e3f7](https://github.com/MapColonies/geocoding/commit/a38e3f72f4365c0717c533c00fe8f72ec596489a))

## [1.1.0](https://github.com/MapColonies/geocoding/compare/v1.0.1...v1.1.0) (2025-02-12)


### Features

* removed redis ttl ([#73](https://github.com/MapColonies/geocoding/issues/73)) ([c544f5d](https://github.com/MapColonies/geocoding/commit/c544f5d0fef57ea02ff1cfd7b6a3696f63da4645))

### [1.0.1](https://github.com/MapColonies/geocoding/compare/v1.0.0...v1.0.1) (2024-12-05)

### Features
* ignore roads unless explicitly ([#72 ](https://github.com/MapColonies/geocoding/issues/72)) ([cf5b4a2](https://github.com/MapColonies/geocoding/commit/cf5b4a28104464f052637724b780b5c4862d1525))


### Bug Fixes

* added 'disable' prefix to boolean-parameter-prefixes ([#68](https://github.com/MapColonies/geocoding/issues/68)) ([2674616](https://github.com/MapColonies/geocoding/commit/267461649cde20c443a01b0bedbe180206078d26))
* added to redis api-key from token ([#70](https://github.com/MapColonies/geocoding/issues/70)) ([8b4d14d](https://github.com/MapColonies/geocoding/commit/8b4d14dcc8aaf59aa5f706e6590056d6484ce8df))
* use NotFound response, remove subTileSchema ([#69](https://github.com/MapColonies/geocoding/issues/69)) ([5a376de](https://github.com/MapColonies/geocoding/commit/5a376dee8907be6dadfcf798a2fb34f71ef52038))

## [1.0.0](https://github.com/MapColonies/geocoding/compare/v0.2.2...v1.0.0) (2024-11-21)


### Features

* control add regions ([#60](https://github.com/MapColonies/geocoding/issues/60)) ([0ea0a2f](https://github.com/MapColonies/geocoding/commit/0ea0a2f958cfcbe05e78fc3dcc0e7985d5f95403))
* location search prefer cities layer ([#64](https://github.com/MapColonies/geocoding/issues/64)) ([a4ada6e](https://github.com/MapColonies/geocoding/commit/a4ada6eff6af198b3b008ef09812bdf30e51f143))


### Bug Fixes

* bbox array of nulls if no results are found ([#65](https://github.com/MapColonies/geocoding/issues/65)) ([0b4c663](https://github.com/MapColonies/geocoding/commit/0b4c663df7b03969ac39ad5242146ed358ee051b))
* location add source validation ([#66](https://github.com/MapColonies/geocoding/issues/66)) ([604bc15](https://github.com/MapColonies/geocoding/commit/604bc15e6bf24557ca9b9489a97ae622d864c3e0))
* updated openapi3 ([#67](https://github.com/MapColonies/geocoding/issues/67)) ([766676c](https://github.com/MapColonies/geocoding/commit/766676c594c76bc952c32697213241f38c70b00c))

### [0.2.2](https://github.com/MapColonies/geocoding/compare/v0.2.1...v0.2.2) (2024-11-17)

### [0.2.1](https://github.com/MapColonies/geocoding/compare/v0.2.0...v0.2.1) (2024-11-14)


### Bug Fixes

* location display name mapco 5394 ([#58](https://github.com/MapColonies/geocoding/issues/58)) ([eeb6480](https://github.com/MapColonies/geocoding/commit/eeb6480b440827dba12716d93035a5cfde32edc1))

## [0.2.0](https://github.com/MapColonies/geocoding/compare/v0.1.5...v0.2.0) (2024-11-11)


### Features

* added bbox to query and control results ([#52](https://github.com/MapColonies/geocoding/issues/52)) ([944fde8](https://github.com/MapColonies/geocoding/commit/944fde859303d4dfaf2a605feb62b03584ad15b1))


### Bug Fixes

* **openapi:** added x-api-key as accepted header ([#51](https://github.com/MapColonies/geocoding/issues/51)) ([ce32257](https://github.com/MapColonies/geocoding/commit/ce322575829640c4cb120f680fc5e928c81bed91))
* **openapi:** docker containers run commands ([#49](https://github.com/MapColonies/geocoding/issues/49)) ([9aa9452](https://github.com/MapColonies/geocoding/commit/9aa94524185f6e4fbb0683d427806ef000c3239a))

### [0.1.5](https://github.com/MapColonies/geocoding/compare/v0.1.3...v0.1.5) (2024-11-06)


### Bug Fixes

* added token as a way to authenticate to the service ([#45](https://github.com/MapColonies/geocoding/issues/45)) ([a136a58](https://github.com/MapColonies/geocoding/commit/a136a5852149fb1019ffb1e8b4ec5abebcbcfe82))
* **openapi3.yaml:** removed required x-user-id ([#46](https://github.com/MapColonies/geocoding/issues/46)) ([3bd3de5](https://github.com/MapColonies/geocoding/commit/3bd3de524fa8b76708150097e75f987149842c26))

### [0.1.4](https://github.com/MapColonies/geocoding/compare/v0.1.3...v0.1.4) (2024-11-05)


### Bug Fixes

* added token as a way to authenticate to the service ([#45](https://github.com/MapColonies/geocoding/issues/45)) ([a136a58](https://github.com/MapColonies/geocoding/commit/a136a5852149fb1019ffb1e8b4ec5abebcbcfe82))

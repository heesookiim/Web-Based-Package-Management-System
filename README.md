# A Trustworthy Module Registry

Fall 2023 Purdue ECE 461 Project Phase 2 by group 8.


### Installation

Step-by-step instructions on how to install and run the project.

```js
# Command to install dependencies
npm install
```

```js
# Starts the program
npm run API
```

```js
# Tests the program
npm test
```


### Endpoints supported 
| Endpoint | Description |
| -------- | ----------- |
| `POST /packages` | Get the packages from the registry. |
| `POST /package/byRegEx` | Get any packages fitting the regular expression |
| `POST /package` | Upload or Ingest a new package |
| `DELETE /reset` | Reset the registry |
| `DELETE /package/{id}` | Delete this version of the package |
| `DELETE /package/byName/{name}` | Delete all versions of this package |
| `GET /package/{id}` | Interact with the package with this ID |
| `GET /package/{id}/rate` | Get ratings for this package |
| `PUT /package/{id}` | Update this content of the package |
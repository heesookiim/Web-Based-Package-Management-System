# A Trustworthy Module Registry

Fall 2023 ECE 461 Group 8. Project Phase 2.


### Installation

Step-by-step instructions on how to install and run the project.

```bash
# Command to install dependencies
./run install
```

```js
# Starts the program
npm run API
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




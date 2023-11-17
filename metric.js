"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rampUp = exports.cloneRepository = exports.getDirectorySize = exports.getFileSize = exports.timeoutPromise = exports.responsiveMaintainer = exports.correctness = exports.license = exports.busFactor = void 0;
var axios_1 = require("axios");
var path = require("path");
var logger_cfg_1 = require("./logger_cfg");
var clone = require('isomorphic-git').clone;
var fs = require('fs');
var http = require('isomorphic-git/http/node');
var tmp = require('tmp');
var logFile = process.env.LOG_FILE;
var token = process.env.GITHUB_TOKEN;
if (!token || !token.trim()) {
    logger_cfg_1.logger.error('GITHUB_TOKEN environment variable is not set or is an empty string.');
    process.exit(1);
}
if (!logFile || !logFile.trim()) {
    logger_cfg_1.logger.error('LOG_FILE environment variable is not set or is an empty string.');
    process.exit(1);
}
else if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '');
}
var headers = {
    Authorization: "Bearer ".concat(token),
};
function busFactor(repositoryUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var repositoryResponse, repositoryData, _a, user, repo, dirName, repoFilename, totalCommits_1, contributorsUrl, contributorsResponse, contributorsData, contributorsFilename, significantContributors, sigLength, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, axios_1.default.get(repositoryUrl, { headers: headers })];
                case 1:
                    repositoryResponse = _b.sent();
                    repositoryData = repositoryResponse.data;
                    _a = repositoryUrl.split('/'), user = _a[3], repo = _a[4];
                    dirName = "".concat(user, "_").concat(repo);
                    if (!fs.existsSync(dirName)) {
                        fs.mkdirSync(dirName);
                    }
                    repoFilename = path.join(dirName, 'repositoryData.json');
                    fs.writeFileSync(repoFilename, JSON.stringify(repositoryData, null, 2));
                    totalCommits_1 = 0;
                    contributorsUrl = repositoryData.contributors_url;
                    return [4 /*yield*/, axios_1.default.get(contributorsUrl, { headers: headers })];
                case 2:
                    contributorsResponse = _b.sent();
                    contributorsData = contributorsResponse.data;
                    contributorsFilename = path.join(dirName, 'contributorsData.json');
                    fs.writeFileSync(contributorsFilename, JSON.stringify(contributorsData, null, 2));
                    contributorsData.forEach(function (contributor) {
                        totalCommits_1 += contributor.contributions;
                    });
                    significantContributors = contributorsData.filter(function (contributor) { return (contributor.contributions / totalCommits_1) * 100 > 5; });
                    sigLength = significantContributors.length;
                    if (sigLength > 10) {
                        return [2 /*return*/, 1];
                    }
                    else {
                        return [2 /*return*/, parseFloat((sigLength / 10).toFixed(1))];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    logger_cfg_1.logger.error('Error:', error_1.message);
                    return [2 /*return*/, -1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.busFactor = busFactor;
function license(repositoryUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var licenseUrl, LicenseResponse, _a, user, repo, dirName, licenseFilename, sanitizedResponse, error_2, _b, user, repo, dirName, licenseFilename, sanitizedResponse;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    licenseUrl = "".concat(repositoryUrl, "/license");
                    return [4 /*yield*/, axios_1.default.get(licenseUrl, { headers: headers })];
                case 1:
                    LicenseResponse = _c.sent();
                    _a = repositoryUrl.split('/'), user = _a[3], repo = _a[4];
                    dirName = "".concat(user, "_").concat(repo);
                    if (!fs.existsSync(dirName)) {
                        fs.mkdirSync(dirName);
                    }
                    licenseFilename = path.join(dirName, 'licenseData.json');
                    sanitizedResponse = {
                        data: LicenseResponse.data,
                        status: LicenseResponse.status
                    };
                    fs.writeFileSync(licenseFilename, JSON.stringify(sanitizedResponse, null, 2));
                    if (LicenseResponse.data && LicenseResponse.data.license) {
                        return [2 /*return*/, 1];
                    }
                    else {
                        return [2 /*return*/, 0];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _c.sent();
                    if (error_2.response) {
                        if (error_2.response.status === 404) {
                            _b = repositoryUrl.split('/'), user = _b[3], repo = _b[4];
                            dirName = "".concat(user, "_").concat(repo);
                            if (!fs.existsSync(dirName)) {
                                fs.mkdirSync(dirName);
                            }
                            licenseFilename = path.join(dirName, 'licenseData.json');
                            sanitizedResponse = {
                                data: error_2.response.data,
                                status: error_2.response.status
                            };
                            fs.writeFileSync(licenseFilename, JSON.stringify(sanitizedResponse, null, 2));
                            return [2 /*return*/, 0];
                        }
                        else {
                            logger_cfg_1.logger.error("Unexpected response status: ".concat(error_2.response.status));
                            return [2 /*return*/, -1];
                        }
                    }
                    else {
                        logger_cfg_1.logger.error('Error:', error_2.message);
                        return [2 /*return*/, -1];
                    }
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.license = license;
function correctness(repositoryUrl) {
    return __awaiter(this, void 0, void 0, function () {
        // Function to recursively fetch all issues
        function fetchAllIssues(page) {
            if (page === void 0) { page = 1; }
            return __awaiter(this, void 0, void 0, function () {
                var response, _a, user, repo, dirName, issues, linkHeader, nextPage, bugPercentage, error_3;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 5, , 6]);
                            return [4 /*yield*/, axios_1.default.get(issuesUrl, { params: __assign(__assign({}, params), { page: page }), headers: headers })];
                        case 1:
                            response = _b.sent();
                            _a = repositoryUrl.split('/'), user = _a[3], repo = _a[4];
                            dirName = "".concat(user, "_").concat(repo);
                            if (!fs.existsSync(dirName)) {
                                fs.mkdirSync(dirName);
                            }
                            fs.writeFileSync(path.join(dirName, "issuesData_page".concat(page, ".json")), JSON.stringify(response.data, null, 2));
                            issues = response.data;
                            totalIssues += issues.length;
                            totalClosedIssues += issues.filter(function (issue) { return issue.state === 'closed'; }).length;
                            linkHeader = response.headers.link;
                            if (!(linkHeader && linkHeader.includes('rel="next"'))) return [3 /*break*/, 3];
                            nextPage = page + 1;
                            return [4 /*yield*/, fetchAllIssues(nextPage)];
                        case 2: return [2 /*return*/, _b.sent()];
                        case 3:
                            bugPercentage = (totalClosedIssues / totalIssues);
                            logger_cfg_1.logger.info("Correctness: ".concat(bugPercentage.toFixed(5)));
                            return [2 /*return*/, bugPercentage];
                        case 4: return [3 /*break*/, 6];
                        case 5:
                            error_3 = _b.sent();
                            logger_cfg_1.logger.error('Error making API request:', error_3);
                            return [2 /*return*/, 0];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        }
        var repositoryResponse, repositoryData, issuesUrl, params, totalIssues, totalClosedIssues, perc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, axios_1.default.get(repositoryUrl, { headers: headers })];
                case 1:
                    repositoryResponse = _a.sent();
                    repositoryData = repositoryResponse.data;
                    issuesUrl = repositoryUrl + "/issues?state=all";
                    params = {
                        state: 'all',
                        per_page: 100,
                        page: 1, // Start with page 1
                    };
                    totalIssues = 0;
                    totalClosedIssues = 0;
                    return [4 /*yield*/, fetchAllIssues()];
                case 2:
                    perc = _a.sent();
                    return [2 /*return*/, parseFloat((perc * .9).toFixed(1))];
            }
        });
    });
}
exports.correctness = correctness;
function responsiveMaintainer(repositoryUrl) {
    return __awaiter(this, void 0, void 0, function () {
        function fetchCommentsForIssue(issue) {
            return __awaiter(this, void 0, void 0, function () {
                var response, _a, user, repo, dirName, commentsFilename, comments, maintainerComments, firstMaintainerComment, createdAt, respondedAt, responseTime, error_4;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, axios_1.default.get(issue.comments_url, { headers: headers })];
                        case 1:
                            response = _b.sent();
                            _a = repositoryUrl.split('/'), user = _a[3], repo = _a[4];
                            dirName = "".concat(user, "_").concat(repo);
                            // Ensure the directory exists
                            if (!fs.existsSync(dirName)) {
                                fs.mkdirSync(dirName);
                            }
                            commentsFilename = path.join(dirName, "commentsData_issue".concat(issue.number, ".json"));
                            fs.writeFileSync(commentsFilename, JSON.stringify(response.data, null, 2));
                            if (response.status === 200) {
                                comments = response.data;
                                maintainerComments = comments.filter(function (comment) { return comment.user.type === 'User'; });
                                if (maintainerComments.length > 0) {
                                    firstMaintainerComment = maintainerComments[0];
                                    createdAt = new Date(issue.created_at);
                                    respondedAt = new Date(firstMaintainerComment.created_at);
                                    responseTime = respondedAt.getTime() - createdAt.getTime();
                                    totalResponseTime += ((responseTime / 1000) / 60) / 60;
                                    totalIssues++;
                                }
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            error_4 = _b.sent();
                            logger_cfg_1.logger.error('Error fetching comments for issue:', error_4);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        }
        function fetchAllIssues(page) {
            if (page === void 0) { page = 1; }
            return __awaiter(this, void 0, void 0, function () {
                var response, issues, linkHeader, nextPage, averageResponseTime, error_5;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            return [4 /*yield*/, axios_1.default.get(issuesUrl, { params: __assign(__assign({}, params), { page: page }), headers: headers })];
                        case 1:
                            response = _a.sent();
                            issues = response.data;
                            return [4 /*yield*/, Promise.all(issues.slice(0, 10).map(fetchCommentsForIssue))];
                        case 2:
                            _a.sent();
                            linkHeader = response.headers.link;
                            if (!(linkHeader && linkHeader.includes('rel="next"'))) return [3 /*break*/, 4];
                            nextPage = page + 1;
                            return [4 /*yield*/, fetchAllIssues(nextPage)];
                        case 3: return [2 /*return*/, _a.sent()];
                        case 4:
                            averageResponseTime = totalResponseTime / totalIssues / 100;
                            logger_cfg_1.logger.info("ResponsiveMaintainer: ".concat(averageResponseTime));
                            if (averageResponseTime > 10) {
                                return [2 /*return*/, 0];
                            }
                            else {
                                return [2 /*return*/, parseFloat(((10 - averageResponseTime) / 10).toFixed(1))];
                            }
                            _a.label = 5;
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            error_5 = _a.sent();
                            logger_cfg_1.logger.error('Error making API request:', error_5);
                            return [2 /*return*/, 0];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        }
        var issuesUrl, params, totalIssues, totalResponseTime;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    issuesUrl = "".concat(repositoryUrl, "/issues?state=all");
                    params = {
                        state: 'all',
                        per_page: 100,
                        page: 1,
                    };
                    totalIssues = 0;
                    totalResponseTime = 0;
                    return [4 /*yield*/, fetchAllIssues()];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.responsiveMaintainer = responsiveMaintainer;
function timeoutPromise(ms) {
    return new Promise(function (_, reject) {
        setTimeout(function () {
            reject(new Error("Operation timed out after ".concat(ms, " milliseconds")));
        }, ms);
    });
}
exports.timeoutPromise = timeoutPromise;
function getFileSize(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var stats, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.promises.stat(filePath)];
                case 1:
                    stats = _a.sent();
                    return [2 /*return*/, stats.size];
                case 2:
                    error_6 = _a.sent();
                    logger_cfg_1.logger.error("Error processing file ".concat(filePath, ":"), error_6);
                    return [2 /*return*/, 0];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.getFileSize = getFileSize;
function getDirectorySize(directory, excludeFile) {
    return __awaiter(this, void 0, void 0, function () {
        var files, size, _i, files_1, file, filePath, stats, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fs.promises.readdir(directory)];
                case 1:
                    files = _b.sent();
                    size = 0;
                    _i = 0, files_1 = files;
                    _b.label = 2;
                case 2:
                    if (!(_i < files_1.length)) return [3 /*break*/, 7];
                    file = files_1[_i];
                    if (excludeFile && path.join(directory, file) === excludeFile)
                        return [3 /*break*/, 6];
                    filePath = path.join(directory, file);
                    return [4 /*yield*/, fs.promises.stat(filePath)];
                case 3:
                    stats = _b.sent();
                    if (!stats.isDirectory()) return [3 /*break*/, 5];
                    _a = size;
                    return [4 /*yield*/, getDirectorySize(filePath, excludeFile)];
                case 4:
                    size = _a + _b.sent();
                    return [3 /*break*/, 6];
                case 5:
                    size += stats.size;
                    _b.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7: return [2 /*return*/, size];
            }
        });
    });
}
exports.getDirectorySize = getDirectorySize;
function cloneRepository(repositoryUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var tempDir, localDir, userAgent, newURL, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    tempDir = tmp.dirSync({ unsafeCleanup: true, prefix: 'temp-' });
                    localDir = tempDir.name;
                    userAgent = 'UAgent';
                    newURL = repositoryUrl.replace('api.github.com/repos', 'github.com');
                    logger_cfg_1.logger.info("Awaiting clone");
                    return [4 /*yield*/, Promise.race([
                            clone({
                                fs: fs,
                                http: http,
                                url: newURL,
                                dir: localDir,
                                onAuth: function () { return ({ token: token }); },
                                headers: {
                                    'User-Agent': userAgent,
                                },
                            }),
                            timeoutPromise(10000)
                        ])];
                case 1:
                    _a.sent();
                    logger_cfg_1.logger.info("Cloned Repo");
                    return [2 /*return*/, localDir];
                case 2:
                    error_7 = _a.sent();
                    if (error_7 instanceof Error) {
                        logger_cfg_1.logger.error('Error cloning repository:', error_7.message);
                    }
                    else {
                        logger_cfg_1.logger.error('Error cloning repository:', error_7);
                    }
                    return [2 /*return*/, ''];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.cloneRepository = cloneRepository;
function rampUp(repositoryUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var tempDir, localDir, readmePaths, readmeSize, _i, readmePaths_1, readmePath, err_1, codebaseSize, ratio, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    tempDir = tmp.dirSync({ unsafeCleanup: true, prefix: 'temp-' });
                    return [4 /*yield*/, cloneRepository(repositoryUrl)];
                case 1:
                    localDir = _a.sent();
                    if (!localDir) {
                        throw new Error('Failed to clone repository');
                    }
                    readmePaths = [
                        path.join(localDir, 'README.md'),
                        path.join(localDir, 'readme.md'),
                        path.join(localDir, 'README.MD')
                    ];
                    readmeSize = 0;
                    _i = 0, readmePaths_1 = readmePaths;
                    _a.label = 2;
                case 2:
                    if (!(_i < readmePaths_1.length)) return [3 /*break*/, 7];
                    readmePath = readmePaths_1[_i];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    logger_cfg_1.logger.debug("Getting file size: ", readmePath);
                    return [4 /*yield*/, getFileSize(readmePath)];
                case 4:
                    readmeSize = _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    err_1 = _a.sent();
                    logger_cfg_1.logger.error('Error getting README file size:', err_1);
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7: return [4 /*yield*/, getDirectorySize(localDir, readmePaths.find(function (p) { return fs.existsSync(p); }))];
                case 8:
                    codebaseSize = _a.sent();
                    ratio = Math.log(readmeSize + 1) / Math.log(codebaseSize + 1);
                    tempDir.removeCallback();
                    return [2 /*return*/, parseFloat(ratio.toFixed(1))];
                case 9:
                    error_8 = _a.sent();
                    if (error_8 instanceof Error) {
                        logger_cfg_1.logger.error('Error analyzing repository:', error_8.message);
                    }
                    else {
                        logger_cfg_1.logger.error('Error analyzing repository:', error_8);
                    }
                    return [2 /*return*/, -1];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.rampUp = rampUp;

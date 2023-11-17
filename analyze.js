"use strict";
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
exports.analyzeDependencies = void 0;
var fs = require("fs");
var axios_1 = require("axios");
var process_1 = require("process");
var metric_1 = require("./metric");
var logger_cfg_1 = require("./logger_cfg");
function checkForInvalidNumber(value) {
    if (value === null || isNaN(value)) {
        return -1;
    }
    return value;
}
function analyzeDependencies(URL_FILE) {
    return __awaiter(this, void 0, void 0, function () {
        var urls, _i, urls_1, url, packageName, data, repositoryUrl, newUrl, rampUpResult, _a, CorrectnessResult, _b, BusFactorResult, _c, ResponsiveMaintainerResult, _d, LicenseResult, _e, rawNetScore, finalNetScore, scores, newUrl, rampUpResult, _f, CorrectnessResult, _g, BusFactorResult, _h, ResponsiveMaintainerResult, _j, LicenseResult, _k, rawNetScore, finalNetScore, scores, err_1;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    _l.trys.push([0, 18, , 19]);
                    urls = fs.readFileSync(URL_FILE, 'utf-8').split('\n').filter(Boolean);
                    _i = 0, urls_1 = urls;
                    _l.label = 1;
                case 1:
                    if (!(_i < urls_1.length)) return [3 /*break*/, 17];
                    url = urls_1[_i];
                    logger_cfg_1.logger.info('Analyzing:', url);
                    if (!url.includes('npmjs.com')) return [3 /*break*/, 10];
                    packageName = url.split('/').pop();
                    if (!packageName) {
                        throw new Error("Invalid URL: ".concat(url));
                    }
                    return [4 /*yield*/, fetchNpmDataWithAxios(packageName)];
                case 2:
                    data = _l.sent();
                    repositoryUrl = getGithubUrlFromNpmData(data);
                    if (!repositoryUrl) return [3 /*break*/, 8];
                    newUrl = repositoryUrl.replace('github.com', 'api.github.com/repos');
                    _a = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.rampUp)(newUrl)];
                case 3:
                    rampUpResult = _a.apply(void 0, [_l.sent()]);
                    _b = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.correctness)(newUrl)];
                case 4:
                    CorrectnessResult = _b.apply(void 0, [_l.sent()]);
                    _c = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.busFactor)(newUrl)];
                case 5:
                    BusFactorResult = _c.apply(void 0, [_l.sent()]);
                    _d = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.responsiveMaintainer)(newUrl)];
                case 6:
                    ResponsiveMaintainerResult = _d.apply(void 0, [_l.sent()]);
                    _e = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.license)(newUrl)];
                case 7:
                    LicenseResult = _e.apply(void 0, [_l.sent()]);
                    rawNetScore = (rampUpResult + CorrectnessResult + BusFactorResult + ResponsiveMaintainerResult) / 4;
                    finalNetScore = parseFloat(rawNetScore.toFixed(1));
                    if (finalNetScore < 0) {
                        finalNetScore = 0;
                    }
                    scores = {
                        URL: url,
                        NET_SCORE: finalNetScore,
                        RAMP_UP_SCORE: rampUpResult,
                        CORRECTNESS_SCORE: CorrectnessResult,
                        BUS_FACTOR_SCORE: BusFactorResult,
                        RESPONSIVE_MAINTAINER_SCORE: ResponsiveMaintainerResult,
                        LICENSE_SCORE: LicenseResult
                    };
                    console.log(JSON.stringify(scores));
                    logger_cfg_1.logger.info('GitHub scores:', JSON.stringify(scores, null, 2));
                    return [3 /*break*/, 9];
                case 8:
                    logger_cfg_1.logger.error('No GitHub URL found for:', url);
                    _l.label = 9;
                case 9: return [3 /*break*/, 16];
                case 10:
                    if (!url.includes('github.com')) return [3 /*break*/, 16];
                    logger_cfg_1.logger.debug('GitHub URL found:', url);
                    newUrl = url.replace('github.com', 'api.github.com/repos');
                    logger_cfg_1.logger.debug('New URL:', newUrl);
                    _f = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.rampUp)(newUrl)];
                case 11:
                    rampUpResult = _f.apply(void 0, [_l.sent()]);
                    _g = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.correctness)(newUrl)];
                case 12:
                    CorrectnessResult = _g.apply(void 0, [_l.sent()]);
                    _h = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.busFactor)(newUrl)];
                case 13:
                    BusFactorResult = _h.apply(void 0, [_l.sent()]);
                    _j = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.responsiveMaintainer)(newUrl)];
                case 14:
                    ResponsiveMaintainerResult = _j.apply(void 0, [_l.sent()]);
                    _k = checkForInvalidNumber;
                    return [4 /*yield*/, (0, metric_1.license)(newUrl)];
                case 15:
                    LicenseResult = _k.apply(void 0, [_l.sent()]);
                    rawNetScore = (rampUpResult + CorrectnessResult + BusFactorResult + ResponsiveMaintainerResult) / 4;
                    finalNetScore = parseFloat(rawNetScore.toFixed(1));
                    if (finalNetScore < 0) {
                        finalNetScore = 0;
                    }
                    scores = {
                        URL: url,
                        NET_SCORE: finalNetScore,
                        RAMP_UP_SCORE: rampUpResult,
                        CORRECTNESS_SCORE: CorrectnessResult,
                        BUS_FACTOR_SCORE: BusFactorResult,
                        RESPONSIVE_MAINTAINER_SCORE: ResponsiveMaintainerResult,
                        LICENSE_SCORE: LicenseResult
                    };
                    console.log(JSON.stringify(scores));
                    logger_cfg_1.logger.info('GitHub scores:', JSON.stringify(scores, null, 2));
                    _l.label = 16;
                case 16:
                    _i++;
                    return [3 /*break*/, 1];
                case 17: return [3 /*break*/, 19];
                case 18:
                    err_1 = _l.sent();
                    logger_cfg_1.logger.error('Error analyzing dependencies:', err_1);
                    process.exit(1);
                    return [3 /*break*/, 19];
                case 19: return [2 /*return*/];
            }
        });
    });
}
exports.analyzeDependencies = analyzeDependencies;
function getGithubUrlFromNpmData(data) {
    if (data && data.repository && data.repository.url) {
        var repoUrl = data.repository.url;
        logger_cfg_1.logger.debug("Original repo URL:", repoUrl);
        var sanitizedRepoUrl = repoUrl.replace(/\.git$/, '');
        var sshMatch = sanitizedRepoUrl.match(/git\+ssh:\/\/git@github\.com\/([^\/]+\/[^\/]+)/);
        var httpMatch = sanitizedRepoUrl.match(/https?:\/\/github\.com\/([^\/]+\/[^\/]+)/);
        var cleanUrl = null;
        if (sshMatch) {
            cleanUrl = "https://github.com/".concat(sshMatch[1]);
        }
        else if (httpMatch) {
            cleanUrl = "https://github.com/".concat(httpMatch[1]);
        }
        if (cleanUrl) {
            cleanUrl = cleanUrl.replace(/\.git$/, '');
        }
        logger_cfg_1.logger.debug("Cleaned up URL:", cleanUrl);
        return cleanUrl;
    }
    return null;
}
function fetchGitHubDataWithAxios(repositoryUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, user, repo, endpoint, response, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = repositoryUrl.split('/'), user = _a[3], repo = _a[4];
                    endpoint = "https://api.github.com/repos/".concat(user, "/").concat(repo);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1.default.get(endpoint)];
                case 2:
                    response = _b.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error fetching data for:', repositoryUrl, error_1);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function fetchNpmDataWithAxios(packageName) {
    return __awaiter(this, void 0, void 0, function () {
        var endpoint, response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    endpoint = "https://registry.npmjs.org/".concat(packageName);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1.default.get(endpoint, { timeout: 10000 })];
                case 2:
                    response = _a.sent();
                    return [2 /*return*/, response.data];
                case 3:
                    error_2 = _a.sent();
                    console.error('Error fetching data for:', packageName, error_2);
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
console.log('Analyzing file:');
//if (require.main === module) {
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var file;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(process_1.argv.length >= 3)) return [3 /*break*/, 2];
                file = process_1.argv[2];
                console.log('Analyzing file:', file);
                return [4 /*yield*/, analyzeDependencies(file)];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); })();
//}

import * as fs from 'fs';
import axios from 'axios';
import { argv, exit } from "process";
import { busFactor, correctness, license, rampUp, responsiveMaintainer } from './metric';
import { logger } from '../logger_cfg';
import * as dotenv from 'dotenv';
import { analyzePackages, analyzePullRequests } from './new-metrics';
import { PackageRating } from '../schema';

function checkForInvalidNumber(value: number | null): number {
    if (value === null || isNaN(value)) {
        return -1;
    }
    return value;
}

// works single url
export async function analyzeDependencies(url: string) {
    try {
        logger.info('Analyzing: ' + url);
        if (url.includes('npmjs.com')) {
            const packageName = url.split('/').pop();
            if (!packageName) {
                logger.error('Invalid URL: ' + url);
                throw new Error(`Invalid URL: ${url}`);
            }
            const data = await fetchNpmDataWithAxios(packageName);
            const repositoryUrl = getGithubUrlFromNpmData(data);
            if (repositoryUrl) {
                const newUrl = repositoryUrl.replace('github.com', 'api.github.com/repos');
                const rampUpResult = checkForInvalidNumber(await rampUp(newUrl));
                const CorrectnessResult = checkForInvalidNumber(await correctness(newUrl));
                const BusFactorResult = checkForInvalidNumber(await busFactor(newUrl));
                const ResponsiveMaintainerResult = checkForInvalidNumber(await responsiveMaintainer(newUrl));
                const LicenseResult = checkForInvalidNumber(await license(newUrl));
                const rawNetScore = ((rampUpResult + CorrectnessResult + BusFactorResult + ResponsiveMaintainerResult) / 4) * LicenseResult;
                let finalNetScore = parseFloat(rawNetScore.toFixed(1));
                if (finalNetScore < 0) {
                    finalNetScore = 0;
                }

                const scores = {
                    URL: url,
                    NET_SCORE: finalNetScore,
                    RAMP_UP_SCORE: rampUpResult,
                    CORRECTNESS_SCORE: CorrectnessResult,
                    BUS_FACTOR_SCORE: BusFactorResult,
                    RESPONSIVE_MAINTAINER_SCORE: ResponsiveMaintainerResult,
                    LICENSE_SCORE: LicenseResult
                };
                
                logger.info('GitHub scores: ' + JSON.stringify(scores, null, 2));
                return scores;
            } else {
                logger.error('No GitHub URL found for: ' + url);
            }
        } else if (url.includes('github.com')) {
            logger.debug('GitHub URL found: ' + url);
            const newUrl = url.replace('github.com', 'api.github.com/repos');
            logger.debug('New URL: ' + newUrl);
            const rampUpResult = checkForInvalidNumber(await rampUp(newUrl));
            const CorrectnessResult = checkForInvalidNumber(await correctness(newUrl));
            const BusFactorResult = checkForInvalidNumber(await busFactor(newUrl));
            const ResponsiveMaintainerResult = checkForInvalidNumber(await responsiveMaintainer(newUrl));
            const LicenseResult = checkForInvalidNumber(await license(newUrl));
            const rawNetScore = ((rampUpResult + CorrectnessResult + BusFactorResult + ResponsiveMaintainerResult) / 4) * LicenseResult;
            let finalNetScore = parseFloat(rawNetScore.toFixed(1));
            if (finalNetScore < 0) {
                finalNetScore = 0;
            }

            const scores = {
                URL: url,
                NET_SCORE: finalNetScore,
                RAMP_UP_SCORE: rampUpResult,
                CORRECTNESS_SCORE: CorrectnessResult,
                BUS_FACTOR_SCORE: BusFactorResult,
                RESPONSIVE_MAINTAINER_SCORE: ResponsiveMaintainerResult,
                LICENSE_SCORE: LicenseResult
            };
            
            logger.info('GitHub scores: ' + JSON.stringify(scores, null, 2));
            return scores;
        }
    } catch (err) {
        logger.error('Error analyzing dependencies: ' + err);
    }
    return {
        URL: url,
        NET_SCORE: 0,
        RAMP_UP_SCORE: 0,
        CORRECTNESS_SCORE: 0,
        BUS_FACTOR_SCORE: 0,
        RESPONSIVE_MAINTAINER_SCORE: 0,
        LICENSE_SCORE: 0
    };
}

export function getGithubUrlFromNpmData(data: any): string | null {
    if (data && data.repository && data.repository.url) {
        const repoUrl = data.repository.url;
        logger.debug("Original repo URL: " + repoUrl);

        const sanitizedRepoUrl = repoUrl.replace(/\.git$/, '');

        const sshMatch = sanitizedRepoUrl.match(/git\+ssh:\/\/git@github\.com\/([^\/]+\/[^\/]+)/);
        const httpMatch = sanitizedRepoUrl.match(/https?:\/\/github\.com\/([^\/]+\/[^\/]+)/);

        let cleanUrl = null;

        if (sshMatch) {
            cleanUrl = `https://github.com/${sshMatch[1]}`;
        } else if (httpMatch) {
            cleanUrl = `https://github.com/${httpMatch[1]}`;
        }

        if (cleanUrl) {
            cleanUrl = cleanUrl.replace(/\.git$/, '');
        }

        logger.debug("Cleaned up URL: " + cleanUrl);

        return cleanUrl;
    }
    return null;
}

export async function fetchNpmDataWithAxios(packageName: string) {
    const endpoint = `https://registry.npmjs.org/${packageName}`;
    try {
        const response = await axios.get(endpoint, { timeout: 10000 });
        return response.data;
    } catch (error) {
        logger.error('Error fetching data for: ' + packageName, error);
        throw error;
    }
}

// used for ratings called from REST API
export async function getAllRatings(repoUrl: string) {
    dotenv.config();
    logger.info(`Analyzing Link: ${repoUrl}`);

    // get all ratings
    const phase1Scores = await analyzeDependencies(repoUrl);
    logger.debug('Phase 1 scores: ' + JSON.stringify(phase1Scores, null, 2));
    const analyzeRating = await analyzePackages();
    logger.debug('Analyze rating: ' + analyzeRating);
    const pr_review_ratio = await analyzePullRequests(repoUrl);
    logger.debug('PR review ratio: ' + pr_review_ratio);

    // fill in data structure
    const rating: PackageRating = {
        BusFactor: phase1Scores.BUS_FACTOR_SCORE,
        Correctness: phase1Scores.CORRECTNESS_SCORE,
        RampUp: phase1Scores.RAMP_UP_SCORE,
        ResponsiveMaintainer: phase1Scores.RESPONSIVE_MAINTAINER_SCORE,
        LicenseScore: phase1Scores.LICENSE_SCORE,
        GoodPinningPractice: analyzeRating,
        PullRequest: pr_review_ratio,
        NetScore: phase1Scores.NET_SCORE
    };
    logger.info('Final rating: ' + JSON.stringify(rating, null, 2));
    return rating;
}

/*
// used for running from bash script for local testing
(async () => {
    //if (argv.length >= 3) {
    //    const file = argv[2];
    //    logger.info('Analyzing file: ' + file);
        
        // urls from file
    //    const urls = fs.readFileSync(file, 'utf-8').split('\r\n').filter(Boolean);
    //    for(const url of urls) {
    //        let scores = await analyzeDependencies(url);
    //        console.log(JSON.stringify(scores));
    //    }
    //}
    if (argv.length >= 3) {
        const url = argv[2];
        let scores = await getAllRatings(url);
        console.log(JSON.stringify(scores));
    }
})();*/
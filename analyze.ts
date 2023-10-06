import fs from 'fs';
import axios from 'axios';
import { argv, exit } from "process";
import winston from 'winston';

const logLevels = ['error', 'info', 'debug'];
const logLevel = logLevels[Number(process.env.LOG_LEVEL) || 0];
const logFile = process.env.LOG_FILE;

if (!logLevel) {
    
    process.exit(1);
}

if (!logFile || !logFile.trim()) {
    
    process.exit(1);
} else if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, '');
}
const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({ filename: logFile })
    ]
});



import { busFactor, correctness, license, rampUp, responsiveMaintainer } from './metric';

function checkForInvalidNumber(value: number | null): number {
    if (value === null || isNaN(value)) {
        return -1;
    }
    return value;
}


export async function analyzeDependencies(URL_FILE: string) {

    try {
        const urls = fs.readFileSync(URL_FILE, 'utf-8').split('\n').filter(Boolean);

        for (const url of urls) {
            logger.info('Analyzing:', url);

            if (url.includes('npmjs.com')) {
                const packageName = url.split('/').pop();
                if (!packageName) {
                    throw new Error(`Invalid URL: ${url}`);
                }
                const data = await fetchNpmDataWithAxios(packageName);
                const repositoryUrl = getGithubUrlFromNpmData(data);
                if (repositoryUrl) {
                    // const newUrl = repositoryUrl.replace('github.com', 'api.github.com/repos');
                    // const rampUpResult = await rampUp(newUrl);
                    // const CorrectnessResult = await correctness(newUrl);
                    // const BusFactorResult = await busFactor(newUrl);
                    // const ResponsiveMaintainerResult = await responsiveMaintainer(newUrl);
                    // const LicenseResult = await license(newUrl);
                    const newUrl = repositoryUrl.replace('github.com', 'api.github.com/repos');
                    const rampUpResult = checkForInvalidNumber(await rampUp(newUrl));
                    const CorrectnessResult = checkForInvalidNumber(await correctness(newUrl));
                    const BusFactorResult = checkForInvalidNumber(await busFactor(newUrl));
                    const ResponsiveMaintainerResult = checkForInvalidNumber(await responsiveMaintainer(newUrl));
                    const LicenseResult = checkForInvalidNumber(await license(newUrl));
                    const rawNetScore = (rampUpResult + CorrectnessResult + BusFactorResult + ResponsiveMaintainerResult) / 4;
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
                    
                    console.log(JSON.stringify(scores) );
                    
                    logger.info('GitHub scores:', JSON.stringify(scores, null, 2));
                } else {
                    logger.error('No GitHub URL found for:', url);
                }
            } else if (url.includes('github.com')) {
                logger.debug('GitHub URL found:', url);
                const newUrl = url.replace('github.com', 'api.github.com/repos');
                logger.debug('New URL:', newUrl);
                // const rampUpResult = await rampUp(newUrl);
                // const CorrectnessResult = await correctness(newUrl);
                // const BusFactorResult = await busFactor(newUrl);
                // const ResponsiveMaintainerResult = await responsiveMaintainer(newUrl);
                // const LicenseResult = await license(newUrl);
                const rampUpResult = checkForInvalidNumber(await rampUp(newUrl));
                const CorrectnessResult = checkForInvalidNumber(await correctness(newUrl));
                const BusFactorResult = checkForInvalidNumber(await busFactor(newUrl));
                const ResponsiveMaintainerResult = checkForInvalidNumber(await responsiveMaintainer(newUrl));
                const LicenseResult = checkForInvalidNumber(await license(newUrl));
                const rawNetScore = (rampUpResult + CorrectnessResult + BusFactorResult + ResponsiveMaintainerResult) / 4;
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
            
                console.log(JSON.stringify(scores));
                logger.info('GitHub scores:', JSON.stringify(scores, null, 2));
            }
        }
    } catch (err) {
        logger.error('Error analyzing dependencies:', err);

        process.exit(1);
    }
}

function getGithubUrlFromNpmData(data: any): string | null {
    if (data && data.repository && data.repository.url) {
        const repoUrl = data.repository.url;
        logger.debug("Original repo URL:", repoUrl);

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

        logger.debug("Cleaned up URL:", cleanUrl);

        return cleanUrl;
    }
    return null;
}




async function fetchGitHubDataWithAxios(repositoryUrl: string) {
    const [, , , user, repo] = repositoryUrl.split('/');
    const endpoint = `https://api.github.com/repos/${user}/${repo}`;
    try {
        const response = await axios.get(endpoint);
        return response.data;
    } catch (error) {
        console.error('Error fetching data for:', repositoryUrl, error);
        throw error;
    }
}

async function fetchNpmDataWithAxios(packageName: string) {
    const endpoint = `https://registry.npmjs.org/${packageName}`;
    try {
        const response = await axios.get(endpoint, { timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error('Error fetching data for:', packageName, error);
        throw error;
    }
}

if (require.main === module) {
    (async () => {
        if (argv.length >= 3) {
            const file = argv[2];
            await analyzeDependencies(file);
        }
    })();
}
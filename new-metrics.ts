const axios = require('axios');
import { logger } from "./logger_cfg";
const personalAccessToken = process.env.GITHUB_TOKEN; // personalAccessToken stored locally

let count_constraint = 0; // count of how many dependencies are constraint to a particular version
let count_nonConstraint = 0; // count of how many dependencies are not constraint to a particular version
let dependenciesFlag = false; // flag to check if there are dependencies in the package.json file (true if greater than 0)

let count_noReview = 0; // count of how many pull requests have no reviews on them
let count_review = 0; // count of how many pull requests have reviews on them
let pullRequestsFlag = false; // flag to check if there are pull requests in the repo

// function which inspects only the package.json file from a GitHub repo link
async function getPackageJsonFromGitHubRepo(gitHubLink: string) {
    logger.debug(`Entering getPackageJsonFromGitHubRepo function for link: ${gitHubLink}`);
    
    // converts the GitHub link to raw.githubusercontent.com link
    const parts = gitHubLink.split('/');
    if (parts.length < 5 || parts[2] !== 'github.com') {
        logger.error(`Wrong format for ${gitHubLink} and/or broken link`);
    }
    
    let owner = parts[3]; // owner name
    let repo = parts[4]; // repo name
    
    // sets the url for a certain owner and repo
    let rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`;
    logger.debug(`rawUrl: ${rawUrl}`);
    try {
        logger.debug(`Fetching axios request for file: ${rawUrl}`);
        const response = await axios.get(rawUrl); // sends axios request and returns the value
        logger.debug(`Exiting successfully from getPackageJsonFromGitHubRepo function for link: ${gitHubLink}`);
        return response.data;
    } catch (error) {
        logger.error(`Failed to get axios request for file: ${rawUrl}`);
    }
}

// function which inspects the type of dependencies from a package.json response
function countPackagesWithCaretRange(packageJson: any, dependencyType: string) {
    logger.debug(`Entering countPackagesWithCaretRange function for dependency type: ${dependencyType}`);
    
    // checks if the dependency t
    if (packageJson[dependencyType]) {
        dependenciesFlag = true; // flag to ensure that dependencies do exist in the repo
        for (const packageName in packageJson[dependencyType]) {
            if (packageJson[dependencyType][packageName].startsWith('^')) {
                count_nonConstraint++; // since it has the caret symbol, it's non constraint
            } else {
                count_constraint++; // otherwise it's constraint to a specific version
            }
        }
        logger.debug(`Exiting successfully from countPackagesWithCaretRange function for dependency type: ${dependencyType}`);
    } else {
        logger.debug(`Dependency type ${dependencyType} doesn't exist in package.json`);
    }
}

// main function of the file calls the required functions for a GitHub repo link - 1st metric
export async function analyzePackages(gitHubLink: string): Promise<any> {
    logger.info(`Analyzing GitHub Link: ${gitHubLink}`);
    let rating = 1; // if no dependencies exist then the rating is 1
    
    /** reset **/
    count_constraint = 0; // count of how many dependencies are constraint to a particular version
    count_nonConstraint = 0; // count of how many dependencies are not constraint to a particular version
    dependenciesFlag = false; // flag to check if there are dependencies in the package.json file (true if greater than 0)

    try {
        const packageJson = await getPackageJsonFromGitHubRepo(gitHubLink); // converts the gitHubLink to a raw GitHub response for that file
        countPackagesWithCaretRange(packageJson, 'dependencies'); // analyzes the dependencies data type from the response
        countPackagesWithCaretRange(packageJson, 'devDependencies'); // analyzes the devDependencies data type from the response

        if (dependenciesFlag) {
            rating = count_nonConstraint/(count_nonConstraint + count_constraint); // calculates the rating
            // if all dependencies are constrains then count_nonConstraint = 0 so rating is 0
        }
    } catch (error) {
        logger.error(`Failed async call for function analyzePackages for GitHub Link: ${gitHubLink}`);
        rating = 0;
    }
    
    return rating;
}

// Function to fetch reviews for a single pull request
async function fetchReviewsForPullRequest(pr: any) {
    // examinining the reviews endpoint for each pull request
    const reviewsUrl = `${pr.url}/reviews`;
    try {
        const reviewsResponse = await axios.get(reviewsUrl, {
            headers: {
                Authorization: `token ${personalAccessToken}`,
            },
        });

        const reviews = reviewsResponse.data;

        // if reviews exist for the closed pull request, increment the reviwed count
        if (reviews.length > 0) {
            count_review++;
        } else {
            count_noReview++; // otherwise increment this count
        }
    } catch (error) {
        logger.error(`failed async function call fetchReviewsForPullRequest`);
    }
}

// main function of the file calls the required functions for a GitHub repo link - 2nd metric
export async function analyzePullRequests(gitHubLink: string) {
    logger.info(`Fetching Pull Requests for GitHub Link: ${gitHubLink}`);

    /** reset **/
    count_noReview = 0;
    count_review = 0;
    pullRequestsFlag = false;

    // checks if the link is valid or not
    const parts = gitHubLink.split('/');
    if (parts.length < 5 || parts[2] !== 'github.com') {
        logger.error(`Wrong format for ${gitHubLink} and/or broken link`);
        return;
    }

    let owner = parts[3]; // owner name
    let repo = parts[4]; // repo name

    // sets the url for a certain owner and repo
    let apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls`;
    logger.debug(`apiUrl: ${apiUrl}`);

    let pr_review_ratio = 0; // if no pull requests exist then the rating is 0
    let pageNumber = 1; // starts from page 1 of the pull requests page
    let sum = 0; // number of completed pull requests
    while (true) {
        // getting the pull requests with parameters: (1) page number, (2) closed state, and (3) 50 results per page
        try {
            const response = await axios.get(`${apiUrl}?state=closed&page=${pageNumber}&per_page=50`, {
                headers: {
                    Authorization: `token ${personalAccessToken}`, // github access token
                },
            });

            const pullRequests = response.data;

            if (pullRequests.length > 0) {
                pullRequestsFlag = true; // if pull requests exist, mark as true
                sum += pullRequests.length; // incrementing sum
            } else {
                break; // escape, no pull requests
            }

            // calling the function to check if reviews exist for it
            const reviewPromises = pullRequests.map(fetchReviewsForPullRequest);
            await Promise.all(reviewPromises); // wait for all review requests to complete

            pageNumber++; // increment to the next page

            // if you're already finished the with the pull requests (capped at 200)
            if (pullRequests.length < 50 || pageNumber * 50 >= 205) {
                break;
            }

        } catch (error) {
            logger.error(`Failed async call for function analyzePullRequests for GitHub Link: ${gitHubLink}`);
            pr_review_ratio = 0;
            break;
        }
    }

    logger.debug(`Analyzed ${sum} Pull Requests`)

    // calculates the number of reviewed pull requests to the total pull requests
    if (pullRequestsFlag) {
        pr_review_ratio = count_review / (count_noReview + count_review);
    } else {
        pr_review_ratio = 0; // 0 by default
    }

    return pr_review_ratio;
}

/** Uncomment to Test Manually (Demo Code)

async function main() {
    let reactRating = await analyzePackages('https://github.com/facebook/react');
    console.log(`Rating: ${reactRating}`);

    let pr_review_ratio = await analyzePullRequests('https://github.com/bhatnag8/461-project-phase1');
    console.log(`pr_review_ratio: ${pr_review_ratio}`);
}
main();

**/

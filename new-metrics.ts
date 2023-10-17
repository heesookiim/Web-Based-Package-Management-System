const axios = require('axios');
const winston = require('winston');
import { logger } from "./analyze";

let count_constraint = 0; // count of how many dependencies are constraint to a particular version
let count_nonConstraint = 0; // count of how many dependencies are not constraint to a particular version
let dependencies = false; // flag to check if there are dependencies in the package.json file (true if greater than 0)

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
        dependencies = true; // flag to ensure that dependencies do exist in the repo
        for (const packageName in packageJson[dependencyType]) {
            if (packageJson[dependencyType][packageName].startsWith('^')) {
                count_nonConstraint++; // since it has the caret symbol, it's non constraint
            } else {
                count_constraint++; // otherwise it's constraint to a specific version
            }
        }
        logger.debug(`Exiting successfully from countPackagesWithCaretRange function for dependency type: ${dependencyType}`);
    } else {
        logger.error(`Dependency type ${dependencyType} doesn't exist in package.json`);
    }
}

// main function of the file calls the required functions for a GitHub repo link
export async function analyzePackages(gitHubLink: string): Promise<any> {
    logger.info(`Analyzing GitHub Link: ${gitHubLink}`);
    let rating = 1; // if no dependencies exist then the rating is 1
    
    /** reset **/
    count_constraint = 0; // count of how many dependencies are constraint to a particular version
    count_nonConstraint = 0; // count of how many dependencies are not constraint to a particular version
    dependencies = false; // flag to check if there are dependencies in the package.json file (true if greater than 0)

    try {
        const packageJson = await getPackageJsonFromGitHubRepo(gitHubLink); // converts the gitHubLink to a raw GitHub response for that file
        countPackagesWithCaretRange(packageJson, 'dependencies'); // analyzes the dependencies data type from the response
        countPackagesWithCaretRange(packageJson, 'devDependencies'); // analyzes the devDependencies data type from the response

        if (dependencies) {
            rating = count_nonConstraint/(count_nonConstraint + count_constraint); // calculates the rating
            // if all dependencies are constrains then count_nonConstraint = 0 so rating is 0
        }
    } catch (error) {
        logger.error(`Failed async call for function analyzePackages for GitHub Link: ${gitHubLink}`);
        rating = 0;
    }
    
    return rating;
}

/** Example Usage

async function main() {
    let reactRating = await analyzePackages('https://github.com/facebook/react');
    console.log(`Final Rating: ${reactRating}`);
}
main();

**/
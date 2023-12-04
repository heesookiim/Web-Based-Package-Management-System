import axios from 'axios';
import * as path from 'path';
import { logger } from '../logger_cfg';
const { clone } = require('isomorphic-git');
const fs = require('fs');
const http = require('isomorphic-git/http/node');
const tmp = require('tmp');
const logFile = process.env.LOG_FILE;
const token = process.env.GITHUB_TOKEN;

if (!token || !token.trim()) {
  logger.error('GITHUB_TOKEN environment variable is not set or is an empty string.');
  process.exit(1);
}

if (!logFile || !logFile.trim()) {
  logger.error('LOG_FILE environment variable is not set or is an empty string.');
  process.exit(1);
} else if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, '');
}
const headers = {
  Authorization: `Bearer ${token}`,
};

export async function busFactor(repositoryUrl: string) {
  try {
    const repositoryResponse = await axios.get(repositoryUrl, { headers });
    const repositoryData = repositoryResponse.data;
    const [, , , user, repo] = repositoryUrl.split('/');

    const dirName = `${user}_${repo}`;
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName);
    }
    const repoFilename = path.join(dirName, 'repositoryData.json');
    fs.writeFileSync(repoFilename, JSON.stringify(repositoryData, null, 2));

    let totalCommits = 0;
    const contributorsUrl = repositoryData.contributors_url;
    const contributorsResponse = await axios.get(contributorsUrl, { headers });
    const contributorsData = contributorsResponse.data;

    const contributorsFilename = path.join(dirName, 'contributorsData.json');
    fs.writeFileSync(contributorsFilename, JSON.stringify(contributorsData, null, 2));

    var totalContributors = 0;
    contributorsData.forEach((contributor: any) => {
      totalCommits += contributor.contributions;
      totalContributors++;
    });

    if(totalContributors === 0) {
      logger.info('BusFactor: 0');
      return 0;
    }

    const significantContributors = contributorsData.filter(
      (contributor: any) => (contributor.contributions / totalCommits) * 100 > 5
    );

    // if someone contributes more than 10% --> significant
    // bus factor is ratio of signifact contributors to total contributors
    var sigLength = significantContributors.length;
    var sigRatio = (sigLength / totalContributors);
    logger.debug(`signficant contributors: ${sigLength}, total contributors: ${totalContributors}`);
    
    // update to be baseed on ratio of contributors that are significant
    
    if(sigRatio > 1) {
      return 1;
    }
    else {
      return parseFloat(sigRatio.toFixed(1));
    }

    /*if(sigLengh > 10) { // old
      return 1;
    }
    else {
      return parseFloat((sigLength / 10).toFixed(1)) ;
    }*/
  } catch (error: any) {
    logger.error('Error:', error.message);
    return 0;
  }
}

export async function license(repositoryUrl: string) {
  // function to check if the license is compatible
  function isLicenseCompatible(license: string) {
    // lists of compatible licenses
    const licenseShortcuts: string[] = ['gnugpl', 'gnugplv3', 'gplv2', 'gplv2', 'lgplv2.1', 'agpl', 'agplv3.0', 'gnuallpermissive', 'apache2', 'artisticlicense2',
      'clarifiedartistic', 'berkeleydb', 'boost', 'modifiedbsd', 'cecill', 'clearbsd', 'cryptixgenerallicense', 'ecos2.0', 'ecl2.0', 'eiffel', 'eudatagrid',
      'expat', 'freebsd', 'freetype', 'hpnd', 'imatix', 'imlib', 'ijg', 'informal', 'intel', 'isc', 'mpl-2.0', 'ncsa', 'newopenldap', 'perllicense',
      'publicdomain', 'python', 'python1.6a2', 'ruby', 'sgifreeb', 'standardmlofnj', 'unicode', 'upl', 'unlicense', 'vim', 'w3c', 'webm', 'wtfpl', 'wx',
      'wxwind', 'x11license', 'xfree861.1license', 'zlib', 'zope2.0', 'mit',
    ];
    const licenseNames: string[] = [
      'gnu general public license version 3', 'gnu general public license version 3', 'gnu general public license version 2', 'gnu general public license version 2',
      'gnu lesser general public license version 2.1', 'gnu affero general public license version 3', 'gnu all-permissive license', 'apache license, version 2.0',
      'artistic license 2.0', 'clarified artistic license', 'berkeley database license', 'sleepycat software product license', 'boost software license',
      'modified bsd license', 'cecill version 2', 'the clear bsd license', 'cryptix general license', 'ecos license version 2.0', 'educational community license 2.0',
      'eiffel forum license, version 2', 'eu datagrid software license', 'expat license', 'freebsd license', 'freetype project license',
      'historical permission notice and disclaimer', 'license of the imatix standard function library', 'license of imlib2', 'independent jpeg group license',
      'informal license', 'intel open source license', 'isc license', 'mozilla public license version 2.0', 'ncsa/university of illinois open source license',
      'openldap license, version 2.7', 'license of perl 5 and below', 'public domain', 'license of python 2.0.1, 2.1.1, and newer versions',
      'license of python 1.6a2 and earlier versions', 'license of ruby', 'sgi free software license b, version 2.0', 'standard ml of new jersey copyright license',
      'unicode, inc. license agreement for data files and software', 'universal permissive license', 'the unlicense', 'license of vim, version 6.1 or later',
      'w3c software notice and license', 'license of webm', 'wtfpl, version 2', 'wxwidgets library license', 'wxwindows library license', 'x11 license',
      'xfree86 1.1 license', 'license of zlib', 'zope public license, versions 2.0 and 2.1', 'mit license',
    ];    
    
    // check if license is in list
    const lowercaseLicense = license.toLowerCase();
    logger.debug('License: ' + lowercaseLicense)

    // Check if the lowercase input contains any license shortcut
    if (licenseShortcuts.some((shortcut) => lowercaseLicense.includes(shortcut))) {
      logger.info('License matches');
      return 1;
    }

    // Check if the lowercase input contains any license name
    if (licenseNames.some((name) => lowercaseLicense.includes(name))) {
      logger.info('License matches');
      return 1;
    }
    
    return 0;
  }

  // checks license for a repository through license url (from recieved phase 1)
  async function licenseURL(repositoryUrl: string) {
    try {
      const licenseUrl = `${repositoryUrl}/license`;
      const LicenseResponse = await axios.get(licenseUrl, { headers });
      const [, , , user, repo] = repositoryUrl.split('/');
      const dirName = `${user}_${repo}`;
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
      }

      const licenseFilename = path.join(dirName, 'licenseData.json');
      const sanitizedResponse = {
        data: LicenseResponse.data,
        status: LicenseResponse.status
      };

      fs.writeFileSync(licenseFilename, JSON.stringify(sanitizedResponse, null, 2));
      if (LicenseResponse.data && LicenseResponse.data.license) { // license was found
        // check for license compatibility
        const license = LicenseResponse.data.license.spdx_id;
        return isLicenseCompatible(license);
      }
    } catch (error: any) {
      return 0;
    }
  }

  // check based on readme
  async function licenseREADME(repositoryUrl: string) {
    try {
      // get readme
      const readmeUrl = `${repositoryUrl}/readme`;
      const readmeResponse = await axios.get(readmeUrl, { headers });
      const [, , , user, repo] = repositoryUrl.split('/');
      const dirName = `${user}_${repo}`;
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
      }
      logger.info('Successfully got readme')
      const readmeFilename = path.join(dirName, 'readmeData.json');
      const sanitizedResponse = {
        data: readmeResponse.data,
        status: readmeResponse.status
      };
      fs.writeFileSync(readmeFilename, JSON.stringify(sanitizedResponse, null, 2));
      if (readmeResponse.data && readmeResponse.data.content) {
        //logger.debug('Readme conent: ' + readmeResponse.data.content)
        const content = Buffer.from(readmeResponse.data.content, 'base64').toString('utf8');

        // check for valid license within readme content
        return isLicenseCompatible(content);
      }
      return 0;
    } catch (error: any) {
      logger.error('Error fetching README: ' + error);
      return 0;
    }
  }

  const licenseScoreURL = await licenseURL(repositoryUrl);
  if(licenseScoreURL === 1) {  // check based on license url
    return 1;
  }
  
  // check based on README
  const licenseScoreREDAME = await licenseREADME(repositoryUrl);
  if(licenseScoreREDAME === 1) {
    return 1;
  } 
  return 0;
}

export async function correctness(repositoryUrl: string) {
  const repositoryResponse = await axios.get(repositoryUrl, { headers });
  const repositoryData = repositoryResponse.data;

  const issuesUrl = repositoryUrl + "/issues?state=all";
  const params = {
    state: 'all',
    per_page: 100, // Increase this value to retrieve more issues per page
    page: 1, // Start with page 1
    since: new Date(new Date().setDate(new Date().getDate() - 365)).toISOString(), // Set to 1 year ago [Changed code]
  };
  let totalIssues = 0;
  let totalClosedIssues = 0;

  // Function to recursively fetch all issues
  async function fetchAllIssues(page: number = 1): Promise<number> {
    try {
      const response = await axios.get(issuesUrl, { params: { ...params, page }, headers });

      const [, , , user, repo] = repositoryUrl.split('/');
      const dirName = `${user}_${repo}`;
      if (!fs.existsSync(dirName)) {

        fs.mkdirSync(dirName);
      }

      fs.writeFileSync(path.join(dirName, `issuesData_page${page}.json`), JSON.stringify(response.data, null, 2));

      const issues = response.data;
      totalIssues += issues.length;
      totalClosedIssues += issues.filter((issue: any) => issue.state === 'closed').length;

      const linkHeader = response.headers.link;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextPage = page + 1;
        return await fetchAllIssues(nextPage);
      } else {
        // check for 0/0
        if (totalIssues === 0) {
          logger.info('Correctness: 0');
          return 0;
        }
        const bugPercentage = (totalClosedIssues / totalIssues);
        logger.info(`Correctness: ${bugPercentage.toFixed(5)}`);
        return bugPercentage;
      }
    } catch (error) {
      logger.error('Error making API request:', error);
      return 0;
    }
  }

  var perc = await fetchAllIssues();
  return parseFloat((perc * .9).toFixed(1));
}

export async function responsiveMaintainer(repositoryUrl: string) {

  const issuesUrl = `${repositoryUrl}/issues?state=all`;
  const params = {
    state: 'all',
    per_page: 100,
    page: 1,
    since: new Date(new Date().setDate(new Date().getDate() - 365)).toISOString(), // Set to 1 year ago [Changed code]
  };
  let totalIssues = 0;
  let totalResponseTime = 0;

  async function fetchCommentsForIssue(issue: any) {
    try {
      const response = await axios.get(issue.comments_url, { headers });

      const [, , , user, repo] = repositoryUrl.split('/');
      const dirName = `${user}_${repo}`;

      // Ensure the directory exists
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
      }

      // Save comments data to the file
      const commentsFilename = path.join(dirName, `commentsData_issue${issue.number}.json`);
      fs.writeFileSync(commentsFilename, JSON.stringify(response.data, null, 2));

      if (response.status === 200) {
        const comments = response.data;
        const maintainerComments = comments.filter((comment: any) => comment.user.type === 'User');
        if (maintainerComments.length > 0) {
          const firstMaintainerComment = maintainerComments[0];
          const createdAt = new Date(issue.created_at);
          const respondedAt = new Date(firstMaintainerComment.created_at);
          const responseTime = respondedAt.getTime() - createdAt.getTime();
          totalResponseTime += ((responseTime / 1000) / 60) / 60;
          totalIssues++;
        }
      }
    } catch (error) {
      logger.error('Error fetching comments for issue:', error);
    }
  }

  async function fetchAllIssues(page: number = 1): Promise<number> {
    try {
      const response = await axios.get(issuesUrl, { params: { ...params, page }, headers });
      const issues = response.data;

      await Promise.all(issues.slice(0, 10).map(fetchCommentsForIssue));

      const linkHeader = response.headers.link;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextPage = page + 1;
        return await fetchAllIssues(nextPage);
      } else {
        // divide by 0 check
        if (totalIssues === 0) {
          logger.info('ResponsiveMaintainer: 0');
          return 0;
        }
        const averageResponseTime = totalResponseTime / totalIssues / 100;
        logger.info(`ResponsiveMaintainer: ${averageResponseTime}`);
        if(averageResponseTime >= 10) {
          return 0;
        }
        else {
          return parseFloat(((10 - averageResponseTime) / 10).toFixed(1));
        }
      }
    } catch (error) {
      logger.error('Error making API request:', error);
      return 0;
    }
  }

  return await fetchAllIssues();
}
export function timeoutPromise(ms: number): Promise<void> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms} milliseconds`));
    }, ms);
  });
}

export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
} catch (error) {
    logger.error(`Error processing file ${filePath}:`, error);
    return 0;
}
  
}

export async function getDirectorySize(directory: string, excludeFile?: string): Promise<number> {
  const files = await fs.promises.readdir(directory);
  let size = 0;

  for (const file of files) {
    if (excludeFile && path.join(directory, file) === excludeFile) continue;

    const filePath = path.join(directory, file);
    const stats = await fs.promises.stat(filePath);

    if (stats.isDirectory()) {
      size += await getDirectorySize(filePath, excludeFile);
    } else {
      size += stats.size;
    }
  }

  return size;
}

export async function cloneRepository(repositoryUrl: string, tempDir: any): Promise<string> {
  try {
    //const tempDir = tmp.dirSync({ unsafeCleanup: true, prefix: 'temp-' });
    const localDir = tempDir.name;
    const userAgent = 'UAgent';
    const newURL = repositoryUrl.replace('api.github.com/repos', 'github.com');
    logger.info("Awaiting clone");
    await clone({
      fs,
      http,
      url: newURL,
      dir: localDir,
      onAuth: () => ({ token }),
      headers: {
        'User-Agent': userAgent,
      },
    });
    logger.info("Cloned Repo");
    return localDir;
  } catch (error) {
    logger.error('Error cloning repository: ' + error);
    return '';
  }
}

export async function rampUp(repositoryUrl: string): Promise<number> {
  try {
    // clone repository
    const tempDir = tmp.dirSync({ unsafeCleanup: true, prefix: 'temp-' });
    const localDir = await cloneRepository(repositoryUrl, tempDir);

    if (!localDir) {
      logger.error('cloned repository does not exist');
      return 0;
    }

    const readmePaths = [
      path.join(localDir, 'README.md'),
      path.join(localDir, 'readme.md'),
      path.join(localDir, 'README.MD')
    ];

    // check which readmePath exists
    let readmePath = '';
    if(fs.existsSync(readmePaths[0])) {
      readmePath = readmePaths[0];
    } else if(fs.existsSync(readmePaths[1])) {
      readmePath = readmePaths[1];
    } else if(fs.existsSync(readmePaths[2])) {
      readmePath = readmePaths[2];
    } else {
      logger.error('No README file found');
      return 0;
    }

    // use readme to calculate rampUp score
    let readmeSize = 0;
    try {
      logger.debug("Getting file size: ", readmePath);
      readmeSize = await getFileSize(readmePath);
    } catch (err) {
      logger.error('Error getting README file size:', err);
    }
    const codebaseSize = await getDirectorySize(localDir, readmePath);

    // check for 0/0
    if(codebaseSize == 0 || readmeSize == 0) {
      logger.info('Rampup score: 0');
      return 0;
    }

    logger.debug('Readme size: ' + readmeSize);
    logger.debug('Codebase size: ' + codebaseSize);

    var ratio = Math.log(readmeSize + 1) / Math.log(codebaseSize + 1);
    logger.debug('Readme vs codebase ratio: ' + ratio);
    ratio = 1 + Math.log10(ratio);
    logger.debug('Readme vs codebase ratio: ' + ratio);

    // check for 0 score
    if(ratio <= 0) {
      logger.info('Rampup score: 0');
      return 0;
    }

    // remove temp directory
    tempDir.removeCallback();

    // finalize score
    ratio = parseFloat(ratio.toFixed(1));
    logger.info('RampUp raw score: ' + ratio);
    if(ratio > 1 || ratio < 0) {
      logger.info('Rampup score: 1');
      return 1;
    }
    else {
      logger.info('Rampup score: ' + ratio);
      return ratio;
    }
  } catch (error) {
    logger.error('Error analyzing repository:', error);
    return 0;
  }
}
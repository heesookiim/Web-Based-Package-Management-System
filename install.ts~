const { execSync } = require('child_process');

export function installDependencies() {
    try {
        console.log("Installing dependencies...");
        execSync('npm install', { stdio: 'inherit' });
        console.log("Dependencies installed successfully");
        process.exit(0);
    } catch (error) {
        console.log("Dependency installation failed:");
        process.exit(1);
    }
}

if (require.main === module) {
    installDependencies();
}
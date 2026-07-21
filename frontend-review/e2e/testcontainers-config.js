const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { DockerComposeEnvironment, Wait } = require('testcontainers');

const composeFile = path.resolve(__dirname, '../docker-compose-e2e-apps.yml');
const terraformDir = path.resolve(__dirname, '../../terraform');
const PROJECT_NAME = 'frontend-review-e2e';

let testContainersRuntime;

async function setupContainers() {
  try {
    testContainersRuntime = await new DockerComposeEnvironment(
        path.dirname(composeFile),
        path.basename(composeFile)
      )
        .withProjectName(PROJECT_NAME)
        .withWaitStrategy('localstack', Wait.forHealthCheck())
        .withWaitStrategy('terraform-apply', Wait.forLogMessage(/Apply complete!/))
        .withWaitStrategy('review-collector', Wait.forHttp("/actuator/health", 8080).forStatusCode(200))
        .withWaitStrategy('review-analyzer', Wait.forHttp("/actuator/health", 8081).forStatusCode(200))
        .withWaitStrategy('frontend-review', Wait.forHttp("/", 80).forStatusCode(200))
        .up();
  } catch (err) {
    console.error('Container setup failed, tearing down before re-throwing:', err.message);
    await teardownContainers();
    throw err;
  }

  console.log('Containers started successfully.');

  return testContainersRuntime;
}

async function teardownContainers() {
  try {
    if (testContainersRuntime) {
      await testContainersRuntime.down();
      testContainersRuntime = undefined;
    } else {
      // setupContainers() may have failed before testcontainers returned a handle
      // (e.g. a bad terraform apply) - fall back to a raw compose down with the
      // fixed project name so nothing is left running.
      execSync(`docker compose -f "${composeFile}" -p ${PROJECT_NAME} down --remove-orphans`, { stdio: 'inherit' });
    }
  } catch (err) {
    console.warn('Failed to tear down E2E containers cleanly:', err.message);
  }

  // Terraform state describes resources inside the now-destroyed LocalStack
  // container; remove it so the next run starts from a clean slate.
  fs.rmSync(path.join(terraformDir, 'terraform.tfstate'), { force: true });
  fs.rmSync(path.join(terraformDir, 'terraform.tfstate.backup'), { force: true });
}

module.exports = { setupContainers, teardownContainers };

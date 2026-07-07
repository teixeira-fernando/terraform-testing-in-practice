const path = require('path');
const { DockerComposeEnvironment, Wait } = require('testcontainers');

const composeFile = path.resolve(__dirname, '../docker-compose-e2e-apps.yml');
let testContainersRuntime;

async function setupContainers() {

  testContainersRuntime = await new DockerComposeEnvironment(
      path.dirname(composeFile),
      path.basename(composeFile)
    )
      .withWaitStrategy('review-collector', Wait.forHttp("/actuator/health", 8080).forStatusCode(200))
      .withWaitStrategy('review-analyzer', Wait.forHttp("/actuator/health", 8081).forStatusCode(200))
      .up();

  console.log('Containers started successfully.');

  return testContainersRuntime;
}

async function teardownContainers() {
  if (testContainersRuntime) {
    await testContainersRuntime.down();
  }
}

module.exports = { setupContainers, teardownContainers };

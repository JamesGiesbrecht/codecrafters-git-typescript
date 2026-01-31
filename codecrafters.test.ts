import { $, stripANSI } from "bun";
import { expect, test } from "bun:test";
// @ts-ignore
import { stages as courseStages } from "./codecrafters-tester/internal/test_helpers/course_definition.yml";

const { CURRENT_STAGE } = process.env;

type Stage = {
  slug: string;
  tester_log_prefix: string;
  title: string;
};

type YamlStage = {
  slug: string;
  name: string;
};

const stages: Stage[] = (courseStages as YamlStage[]).map((stage, i) => ({
  slug: stage.slug,
  tester_log_prefix: `stage-${i + 1}`,
  title: `Stage #${i + 1}: ${stage.name}`,
}));

const runTest = async (stage: Stage) => {
  const testJson = JSON.stringify([stage]);
  let result = "";
  try {
    result = stripANSI(
      await $`
        export CODECRAFTERS_REPOSITORY_DIR=$(pwd)
        export CODECRAFTERS_TEST_CASES_JSON=${testJson}
        $(pwd)/codecrafters-tester/dist/main.out
      `.text(),
    );
  } catch (error) {
    const err = error as any;
    console.log(`Failed with code ${err.exitCode}`);
    console.log(err.stdout.toString());
  }
  expect(result).toContain(stage.title);
  expect(result).toEndWith(`[${stage.tester_log_prefix}] Test passed.\n`);
};

// Get the tests for the current step in the path
// EX: CURRENT_STAGE=3 runs the first 3 stages
const testStages = stages.slice(0, Number(CURRENT_STAGE));

// Generate individual test cases for each stage
testStages.forEach((testStage) => {
  test(testStage.title, async () => {
    await runTest(testStage);
  });
});

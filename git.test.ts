import { $ } from "bun";
// @ts-ignore
import { stages as courseStages } from "./git-tester/internal/test_helpers/course_definition.yml";

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

const run = async () => {
  const testStages = JSON.stringify(stages.slice(0, Number(CURRENT_STAGE)));
  try {
    await $`
    export CODECRAFTERS_REPOSITORY_DIR=$(pwd)
    export CODECRAFTERS_TEST_CASES_JSON=${testStages}
    $(pwd)/git-tester/dist/main.out
    `;
  } catch (error) {
    // no-op
  }
};

await run();

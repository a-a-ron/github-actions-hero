import { IExpressionContext } from "../expressions/evaluator";
import { Conclusion, RuntimeJob, State } from "../runtimeModel";
import { Job } from "../workflow";
import { _ev, _evIf, _executeSteps } from "./runner";
import { arr } from "./shared";

function _executeJob(
  jobId: string,
  jobDef: Job,
  level: number,
  jobCtx: IExpressionContext
): RuntimeJob {
  let conclusion = Conclusion.Success;

  // Should we run this job?
  if (!!jobDef.if) {
    if (!_evIf(jobDef.if, jobCtx)) {
      conclusion = Conclusion.Skipped;
    }
  }

  return {
    id: jobId,
    runnerLabel: arr(jobDef["runs-on"]).map((x) => _ev(x, jobCtx)),
    name: _ev(jobDef.name, jobCtx) || jobId,
    steps: _executeSteps(jobDef.steps, jobCtx),
    state: State.Done,
    conclusion,
    level,
    dependsOn: arr(jobDef.needs),
  };
}

export function executeJob(
  jobId: string,
  jobDef: Job,
  level: number,
  jobCtx: IExpressionContext
): RuntimeJob {
  if (!jobDef.strategy?.matrix) {
    // Simple job
    const job = _executeJob(jobId, jobDef, level, jobCtx);
    return job;
  }

  // Matrix job
  const job: RuntimeJob = {
    id: jobId,
    name: jobId,
    dependsOn: arr(jobDef.needs),
    level,
    state: State.Done,
    conclusion: Conclusion.Success, // TODO: Should depend on the matrix jobs
    steps: [],
    runnerLabel: [],
  };
  const jobs: RuntimeJob[] = [];
  job.matrixJobs = jobs;

  const keys = Object.keys(jobDef.strategy.matrix);
  const idx = keys.map((k) => ({
    key: k,
    idx: 0,
  }));

  while (true) {
    // Generate job
    const name = `${_ev(jobDef.name, jobCtx) || jobId} (${idx
      .map((x) => jobDef.strategy.matrix[x.key][x.idx])
      .join(", ")})`;

    const job = _executeJob(
      `${jobId}-${name}`,
      {
        ...jobDef,
        name,
      },
      level,
      {
        ...jobCtx,
        contexts: {
          ...jobCtx.contexts,
          matrix: {
            ...idx.reduce((m, x) => {
              m[x.key] = jobDef.strategy.matrix[x.key][x.idx];
              return m;
            }, {}),
          },
        },
      }
    );

    jobs.push(job);

    // Iterate over matrix inputs
    let advanced = false;
    for (let i = idx.length - 1; i >= 0; --i) {
      const it = idx[i];

      if (
        it.idx + 1 <
        ((Array.isArray(jobDef.strategy.matrix[it.key])
          ? jobDef.strategy.matrix[it.key]
          : [jobDef.strategy.matrix[it.key]]) as any[]).length
      ) {
        ++it.idx;
        advanced = true;
        break;
      } else {
        it.idx = 0;
      }
    }
    if (!advanced) {
      break;
    }
  }

  return job;
}

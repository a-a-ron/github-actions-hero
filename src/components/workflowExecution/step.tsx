import { Link, StyledOcticon } from "@primer/components";
import { Skip } from "@primer/octicons-react";
import * as React from "react";
import { RuntimeStep, StepType } from "../../lib/runtimeModel";

export const Step: React.FC<{
  step: RuntimeStep;
}> = ({ step }) => {
  let content: JSX.Element = null;

  switch (step.stepType) {
    case StepType.Run:
      content = <code>$ {step.run}</code>;
      break;

    case StepType.Uses:
      const [name, tag] = step.uses.split("@");
      let href: string | undefined = undefined;
      if (name) {
        href = `https://www.github.com/${name}`;

        if (!!tag) {
          href += `/releases/tag/${tag}`;
        }
      }

      content = (
        <>
          Use:{" "}
          <Link target="_blank" href={href}>
            {step.uses}
          </Link>
        </>
      );
      break;
  }

  return (
    <div className={`p-1 text-sm ${step.skipped ? "opacity-50" : ""}`}>
      {step.name && <div className="italic text-xs">{step.name}</div>}
      <div>
        {step.skipped ? <StyledOcticon icon={Skip} /> : null}
        {content}
      </div>
    </div>
  );
};

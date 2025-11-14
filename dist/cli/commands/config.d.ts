import { type ConfigConstraintState } from "../../core/configConstraintState.js";
import { type ConfigCommandResult } from "../ui/configTui.js";
export type { ConfigCommandResult } from "../ui/configTui.js";
interface ConfigCommandOptions {
    cwd?: string;
    constraintsDir?: string;
    stdin?: NodeJS.ReadStream;
    stdout?: NodeJS.WriteStream;
    runInteractive?: (state: ConfigConstraintState[], options: {
        stdin: NodeJS.ReadStream;
        stdout: NodeJS.WriteStream;
        projectRoot: string;
    }) => Promise<ConfigCommandResult>;
}
export declare function runConfigCommand(args: string[], options?: ConfigCommandOptions): Promise<ConfigCommandResult | void>;

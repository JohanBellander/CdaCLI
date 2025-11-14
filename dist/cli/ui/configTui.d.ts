import type { ConfigConstraintState } from "../../core/configConstraintState.js";
export type ConfigCommandResult = {
    status: "cancelled";
} | {
    status: "saved";
    state: ConfigConstraintState[];
};
interface ConfigTuiOptions {
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
    projectRoot: string;
}
export declare function runConfigInteractiveUi(initialState: ConfigConstraintState[], options: ConfigTuiOptions): Promise<ConfigCommandResult>;
export {};

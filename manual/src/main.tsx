import {Command} from "commander";
import {APP_INFO} from "../constants/appInfo";
import * as process from "node:process";
import {registerCommands} from "../commands";

const program = new Command();


program.name(APP_INFO.name)
    .description(APP_INFO.description)
    .version(APP_INFO.version);

registerCommands(program);

program.parse(process.argv)

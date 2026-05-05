import {Command} from "commander";
import {createStartCommand} from "./start";


// /ˈproʊɡræm/
export function registerCommands(program:  Command): void{
    program
        .option('--topic <topic>', '设置当前学习主题')
        .action(async options => {
            console.log(123, options)
        });

    program.command('status')
        .option('--verbose', '打印更多信息')

        .description("status 打印最近一次会话")
        .action(()=> {
            console.log("status 打印最近一次会话")
        })


    program.addCommand(createStartCommand() )
}

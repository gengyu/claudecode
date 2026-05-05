import {Command} from "commander";
import {render} from "ink";
import {APP_INFO} from "../constants/appInfo";
import App from "../componets/App";


export function createStartCommand(): Command {
    return new Command('start')
        .description('启动交互式ui')
        .option("--topic <topic>", "设置当前学习的主题")
        .action(async (options: { topic?: string }) => {
            console.log(options,55)
            await render(<App session={options.topic || "我从从从奥" }/>)
        })
}




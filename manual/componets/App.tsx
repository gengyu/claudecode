import {Text} from "ink";

type AppProps = {
    session: string
}

const App: React.FC<AppProps> = ({session}) => {
    return (
        <Text className="App"
              color={"red"}
              wrap={ true}
              bold={ false}
              dimColor={ false}>{session}</Text>
    )
};


export default App;

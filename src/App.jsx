import Header from "./Header";
import ChatBox from "./ChatBox";

export default function App() {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <ChatBox />
    </div>
  );
}
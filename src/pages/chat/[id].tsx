import classNames from "classnames";
import { PauseCircleFilled } from "@ant-design/icons";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import useIsMobile from "@/hooks/useIsMobile";
import useScroll from "@/hooks/useScroll";
import Message from "@/components/Message";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import { useRouter } from "next/router";
import { ChatStore, DEFAULT_TITLE } from "@/store/Chat";
import { useContext, useMemo, useState } from "react";
import Scrollbar from "@/components/Scrollbar";
import useChatProgress from "@/hooks/useChatProgress";

const inter = Inter({ subsets: ["latin"] });

const ChatPage = () => {
    const isMobile = useIsMobile();
    const router = useRouter();
    const { chat, history, deleteChat, addHistory } = useContext(ChatStore);
    const [responding, setResponding] = useState(false);
    const { scrollRef, scrollToBottom, scrollToTop } = useScroll();
    const { request } = useChatProgress(responding, setResponding);
    const uuid = +(router.query.id || 0);
    const dataSources = useMemo(() => {
        return chat.find((item) => item.uuid === uuid)?.data || [];
    }, [chat, uuid]);
    const currentChatHistory = useMemo(() => {
        return history.find((item) => item.uuid === uuid);
    }, [history, uuid]);

    const limited = useMemo(() => {
        return dataSources?.length > 40 || (Date.now() - new Date(dataSources[dataSources.length - 1]?.dateTime || Date.now()).getTime()) > 1000 * 60 * 180;
    }, [dataSources, dataSources?.length]);

    const onAddHistory = () => {
        const uuid = Date.now();
        addHistory({ title: DEFAULT_TITLE, uuid });
        router.push(`/chat/${uuid}`);
    };

    return (
        <div className="flex flex-col w-full h-full">
            {isMobile && <Header title={currentChatHistory?.title} scrollToTop={scrollToTop} />}
            <main className="flex-1 overflow-hidden">
                <Scrollbar ref={scrollRef}>
                    <div
                        id="image-wrapper"
                        className={classNames(
                            "w-full",
                            "m-auto",
                            "bg-white",
                            "dark:bg-[#101014]",
                            isMobile ? "p-2" : "p-4"
                        )}
                    >
                        {dataSources.length ? (
                            <>
                                {dataSources.map((item, index) => (
                                    <Message
                                        key={index}
                                        dateTime={item.dateTime}
                                        text={item.text}
                                        inversion={item.inversion}
                                        error={item.error}
                                        loading={item.loading}
                                        onRegenerate={() => request(index)}
                                        onDelete={() => deleteChat(uuid, index)}
                                    />
                                ))}
                                {responding && (
                                    <div className="sticky bottom-0 left-0 flex justify-center">
                                        <Button type="primary" onClick={() => setResponding(false)}>
                                            <PauseCircleFilled />
                                            停止对话
                                        </Button>
                                    </div>
                                )}
                                {limited && (
                                    <div className="sticky bottom-0 left-0 flex justify-center">
                                        <Button type="primary" onClick={() => onAddHistory()}>
                                            开始新话题
                                        </Button>
                                </div>
                                )}
                            </>
                        ) : (
                            <div
                                className={classNames(
                                    "flex items-center justify-center mt-4 text-center",
                                    "text-lg text-neutral-300"
                                )}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                    role="img"
                                    width="1em"
                                    height="1em"
                                    className="mr-2 text-3xl"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M16 16a3 3 0 1 1 0 6a3 3 0 0 1 0-6zM6 12c2.21 0 4 1.79 4 4s-1.79 4-4 4s-4-1.79-4-4s1.79-4 4-4zm8.5-10a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11z"
                                    ></path>
                                </svg>
                                <span>Aha~</span>
                            </div>
                        )}
                    </div>
                </Scrollbar>
            </main>
            <Footer
                onMessageUpdate={() => setTimeout(() => scrollToBottom(), 0)}
                responding={responding}
                setResponding={setResponding}
                disabled={limited && '当前对话长度或时间超出了限制，点击开始新的话题'}
            />
        </div>
    );
};

export default ChatPage;

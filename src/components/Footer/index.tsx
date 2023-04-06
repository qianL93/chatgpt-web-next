import useIsMobile from "@/hooks/useIsMobile";
import Button from "@/components/Button";
import classNames from "classnames";
import { useContext, useMemo, useState } from "react";
import { DeleteOutlined, DownloadOutlined, ProfileOutlined, SendOutlined } from "@ant-design/icons";
import { Input, message, Modal } from "antd";
import { useRouter } from "next/router";
import { ChatStore, DEFAULT_TITLE } from "@/store/Chat";
import useChatProgress from "@/hooks/useChatProgress";
import downloadAsImage from "@/utils/downloadAsImage";
import { AppStore } from "@/store/App";

const sleep = (ms = 0) => new Promise(a => setTimeout(() => a(1), ms));

interface Props {
    responding: boolean;
    onMessageUpdate: () => void;
    setResponding: (value: boolean) => void;
    disabled?: boolean | string;
}

const Footer: React.FC<Props> = ({ onMessageUpdate, responding, setResponding, disabled = false }) => {
    const isMobile = useIsMobile();
    const router = useRouter();
    const { chat, history, addChat, clearChat, updateHistory, addHistory } = useContext(ChatStore);
    const { hasContext, setHasContext } = useContext(AppStore);
    const [value, setValue] = useState("");
    const { request } = useChatProgress(responding, setResponding);
    const uuid = +(router.query.id || 0);
    const conversationList = useMemo(() => {
        return chat.find((item) => item.uuid === uuid)?.data || [];
    }, [chat, uuid]);
    const currentHistory = useMemo(() => {
        return history.find((item) => item.uuid === uuid);
    }, [history, uuid]);

    const onAddHistory = () => {
        const uuid = Date.now();
        addHistory({ title: DEFAULT_TITLE, uuid });
        router.push(`/chat/${uuid}`);
    };

    const submit = async (message: string) => {
        if (!message || message.trim() === "") return;

        if (currentHistory?.title && currentHistory.title === DEFAULT_TITLE) {
            updateHistory({ title: message, uuid });
        }

        addChat(uuid, {
            dateTime: new Date().toLocaleString(),
            text: message,
            inversion: true,
            error: false,
            conversationOptions: null,
            requestOptions: { prompt: message, options: null },
        });
        setValue("");
        onMessageUpdate();

        const responseList = conversationList.filter((item) => !item.inversion && !item.error);
        const lastContext = responseList[responseList.length - 1]?.conversationOptions;
        const options = lastContext && hasContext ? { ...lastContext } : {};
        addChat(uuid, {
            dateTime: new Date().toLocaleString(),
            text: "",
            loading: true,
            inversion: false,
            error: false,
            conversationOptions: null,
            requestOptions: { prompt: message, options },
        });
        onMessageUpdate();
        await sleep(100);
        request(conversationList.length ? conversationList.length - 1 : 0, onMessageUpdate);
    };

    const onClear = () => {
        Modal.confirm({
            title: "是否清空当前会话？",
            okText: "确认",
            cancelText: "取消",
            centered: true,
            onOk: () => clearChat(uuid),
        });
    };

    const onChangeContext = () => {
        setHasContext(!hasContext);
        message.success("当前会话已" + (hasContext ? "关闭" : "开启") + "上下文");
    };

    const onDownload = () => {
        const dom = document.querySelector("#image-wrapper") as HTMLElement;
        const title = currentHistory?.title || DEFAULT_TITLE;
        if (dom) {
            downloadAsImage(dom, title.substring(0, 10));
        }
    };

    const onPressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!isMobile) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(value);
            }
        } else {
            if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                submit(value);
            }
        }
    };

    return (
        <footer
            className={classNames(
                isMobile
                    ? ["sticky", "left-0", "bottom-0", "right-0", "p-2", "pr-3", "overflow-hidden"]
                    : ["p-5"]
            )}
        >
            <div className="w-full m-auto">
                <div className="flex items-center justify-between space-x-2">
                    <Button
                        type="text"
                        shape="circle"
                        className="flex items-center justify-center text-lg"
                        onClick={onClear}
                    >
                        <DeleteOutlined />
                    </Button>
                    {!isMobile && (
                        <>
                            <Button
                                type="text"
                                shape="circle"
                                className="flex items-center justify-center text-lg"
                                onClick={onDownload}
                            >
                                <DownloadOutlined />
                            </Button>
                            <Button
                                type="text"
                                shape="circle"
                                className={classNames(
                                    "flex items-center justify-center text-lg hover:text-[#3050fb]",
                                    hasContext && "text-[#3050fb] focus:text-[#3050fb]"
                                )}
                                onClick={onChangeContext}
                            >
                                <ProfileOutlined />
                            </Button>
                        </>
                    )}
                    {disabled ? <Button className="flex-grow" type="primary" onClick={() => onAddHistory()}>
                        {typeof disabled === 'string' ? disabled : '新主题'}
                    </Button> :
                        <Input.TextArea
                            value={value}
                            placeholder={
                                (isMobile ? "来说点什么吧..." : "来说点什么吧...（Shift + Enter = 换行）")
                            }
                            autoSize={{ minRows: 1, maxRows: 2 }}
                            onChange={(e) => setValue(e.target.value)}
                            onPressEnter={onPressEnter}
                        />}
                    {!disabled && <Button type="primary" onClick={() => submit(value)}>
                        <SendOutlined />
                    </Button>}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
